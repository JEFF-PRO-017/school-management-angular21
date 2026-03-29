// notes-saisie.component.ts
// Écran principal de l'enseignant :
// - Sélection classe (parmi ses classes assignées) + séquence
// - Tableau des élèves trié alphabétiquement
// - Une ligne par élève, une colonne par matière avec input note
// - Bouton unique "Enregistrer tout" en bas
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { CacheService } from '../../../core/services/cache.service';
import { DataService } from '../../../core/services/data.service';
import { AuthService } from '../../../core/services/auth.service';
import { Note, Sequence, MatiereConfig, Eleve } from '../../../core/models';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TransfertEleveDialogComponent } from '../transfert-eleve-dialog/transfert-eleve-dialog.component';

@Component({
  selector: 'app-notes-saisie',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule, MatSelectModule, MatButtonModule,
    MatIconModule, MatInputModule,
    MatProgressSpinnerModule, MatTooltipModule,
    LoadingSpinnerComponent, EmptyStateComponent,
  ],
  template: `
    <div class="container-fluid px-0">

      <!-- Titre -->
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h5 class="fw-bold text-primary mb-0">Saisie des notes</h5>
        @if (dirty()) {
          <span class="badge bg-warning text-dark">Modifications non sauvegardées</span>
        }
      </div>

      <!-- Sélecteurs classe + séquence -->
      <div class="row g-2 mb-3">
        <div class="col-12 col-md-5">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Classe</mat-label>
            <mat-select [formControl]="ctrlClasse">
              @for (c of classesDisponibles(); track c.id_classe) {
                <mat-option [value]="c.id_classe">{{ c.nom_classe }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
        <div class="col-12 col-md-4">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Séquence</mat-label>
            <mat-select [formControl]="ctrlSeq">
              @for (s of sequences; track s) {
                <mat-option [value]="s">{{ s }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
        <div class="col-12 col-md-3 d-flex align-items-center">
          <button mat-stroked-button class="w-100" (click)="chargerNotes()"
                  [disabled]="!ctrlClasse.value || !ctrlSeq.value || loading()">
            <mat-icon>refresh</mat-icon> Charger
          </button>
        </div>
      </div>

      <!-- État chargement -->
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      }

      <!-- Tableau de saisie -->
      @if (!loading() && elevesTries().length === 0 && ctrlClasse.value) {
        <app-empty-state icon="people"
          title="Aucun élève dans cette classe">
        </app-empty-state>
      }

      @if (!loading() && elevesTries().length > 0) {

        <!-- Tableau scrollable horizontalement sur mobile -->
        <div class="table-responsive rounded shadow-sm mb-3">
          <table class="table table-bordered table-hover align-middle mb-0">
            <thead class="table-primary">
              <tr>
                <th class="sticky-col bg-primary text-white" style="min-width:160px">Élève</th>
                @for (m of matieres(); track m.id_matiere) {
                  <th class="text-center text-white" style="min-width:110px">
                    {{ m.nom_matiere }}
                    <div class="small fw-normal">coeff {{ m.coefficient }}</div>
                  </th>
                }
                <th class="text-center text-white" style="min-width:90px">Moy.</th>
              </tr>
            </thead>

            <tbody [formGroup]="notesForm">
              @for (eleve of elevesTries(); track eleve.id_eleve; let i = $index) {
                <tr>
                  <!-- Nom élève — colonne collante + bouton transfert -->
                  <td class="sticky-col bg-white">
                    <div class="fw-semibold small">{{ eleve.nom }} {{ eleve.prenom }}</div>
                    <button mat-icon-button
                            style="width:24px;height:24px;line-height:24px"
                            matTooltip="Changer de classe"
                            (click)="ouvrirTransfert(eleve)">
                      <mat-icon style="font-size:16px;width:16px;height:16px">swap_horiz</mat-icon>
                    </button>
                  </td>

                  <!-- Une cellule par matière -->
                  @for (m of matieres(); track m.id_matiere; let j = $index) {
                    <td class="p-1 text-center">
                      <input
                        type="number"
                        class="form-control form-control-sm text-center"
                        style="width:80px;margin:0 auto"
                        min="0" [max]="m.note_eliminatoire ?? 20"
                        step="0.25"
                        [formControlName]="ctrlName(i, j)"
                        (input)="dirty.set(true); calcMoyenne(i)"
                        placeholder="—"
                      >
                    </td>
                  }

                  <!-- Moyenne calculée -->
                  <td class="text-center fw-bold"
                      [class.text-success]="moyennes[i] >= 10"
                      [class.text-danger]="moyennes[i] < 10 && moyennes[i] >= 0">
                    {{ moyennes[i] >= 0 ? moyennes[i].toFixed(2) : '—' }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Bouton enregistrer tout -->
        <div class="d-flex justify-content-end gap-2">
          <span class="text-muted small align-self-center">
            {{ elevesTries().length }} élève(s) · {{ matieres().length }} matière(s)
          </span>
          <button mat-raised-button color="primary"
                  (click)="enregistrerTout()"
                  [disabled]="saving() || !dirty()">
            @if (saving()) {
              <mat-spinner diameter="18" class="d-inline-block me-1"></mat-spinner>
            } @else {
              <mat-icon>save</mat-icon>
            }
            Enregistrer tout
          </button>
        </div>

      }

    </div>
  `,
  styles: [`
    /* Colonne élève collante sur scroll horizontal */
    .sticky-col {
      position: sticky;
      left: 0;
      z-index: 1;
      border-right: 2px solid #dee2e6;
    }
  `]
})
export class NotesSaisieComponent implements OnInit {

  private cache  = inject(CacheService);
  private data   = inject(DataService);
  private auth   = inject(AuthService);
  private snack  = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  sequences: Sequence[] = ['SEQ1','SEQ2','SEQ3','SEQ4','SEQ5','SEQ6'];

  ctrlClasse = new FormControl('');
  ctrlSeq    = new FormControl<Sequence>('SEQ1');

  loading = signal(false);
  saving  = signal(false);
  dirty   = signal(false);

  // Formulaire dynamique : une clé par cellule "eleve_i_matiere_j"
  notesForm = new FormGroup({} as Record<string, AbstractControl>);

  // Moyennes calculées en temps réel par ligne
  moyennes: number[] = [];

  // Données chargées
  private notesExistantes: Note[] = [];

  // ── Données calculées depuis le cache ──

  /** Classes disponibles : toutes pour admin, ses classes pour enseignant */
  classesDisponibles = computed(() => {
    const all = this.cache.getClasses() ?? [];
    if (this.auth.isAdmin()) return all;
    const assigned = this.auth.getClassesAssignees();
    return all.filter(c => assigned.includes(c.id_classe));
  });

  /** Élèves de la classe sélectionnée, triés alphabétiquement */
  elevesTries = computed(() => {
    const id = this.ctrlClasse.value;
    if (!id) return [];
    return (this.cache.getEleves() ?? [])
      .filter(e => e.id_classe === id && e.statut === 'actif')
      .sort((a, b) => a.nom.localeCompare(b.nom));
  });

  /** Matières configurées pour la classe sélectionnée */
  matieres = computed(() => {
    const id = this.ctrlClasse.value;
    if (!id) return [];
    return (this.cache.getMatieres() ?? [])
      .filter(m => m.id_classe === id);
  });

  ngOnInit(): void {
    // Pré-sélectionne la première classe disponible
    const classes = this.classesDisponibles();
    if (classes.length > 0) {
      this.ctrlClasse.setValue(classes[0].id_classe);
    }
  }

  /** Charge les notes existantes depuis Sheets pour pré-remplir le tableau */
  async chargerNotes(): Promise<void> {
    const idClasse = this.ctrlClasse.value;
    const seq      = this.ctrlSeq.value;
    if (!idClasse || !seq) return;

    this.loading.set(true);
    this.notesExistantes = await this.data.getNotesClasse(idClasse, seq);
    this.buildForm();
    this.loading.set(false);
    this.dirty.set(false);
  }

  /** Construit le FormGroup dynamiquement selon élèves × matières */
  private buildForm(): void {
    const eleves   = this.elevesTries();
    const matieres = this.matieres();

    // Réinitialise les contrôles
    Object.keys(this.notesForm.controls).forEach(k =>
      this.notesForm.removeControl(k)
    );
    this.moyennes = new Array(eleves.length).fill(-1);

    eleves.forEach((eleve, i) => {
      matieres.forEach((mat, j) => {
        // Cherche la note existante pour cet élève et cette matière
        const existante = this.notesExistantes.find(
          n => n.id_eleve === eleve.id_eleve && n.matiere === mat.nom_matiere
        );
        const ctrl = new FormControl(existante?.note_obtenue ?? null);
        this.notesForm.addControl(this.ctrlName(i, j), ctrl);
      });
      this.calcMoyenne(i);
    });
  }

  /** Clé unique d'un contrôle note : "e{i}_m{j}" */
  ctrlName(i: number, j: number): string {
    return `e${i}_m${j}`;
  }

  /** Recalcule la moyenne pondérée d'un élève après chaque saisie */
  calcMoyenne(i: number): void {
    const matieres  = this.matieres();
    let totalPoints = 0;
    let totalCoeff  = 0;
    let hasValue    = false;

    matieres.forEach((m, j) => {
      const val = this.notesForm.get(this.ctrlName(i, j))?.value;
      if (val !== null && val !== '' && !isNaN(+val)) {
        totalPoints += (+val / (m.note_eliminatoire ?? 20)) * 20 * m.coefficient;
        totalCoeff  += m.coefficient;
        hasValue     = true;
      }
    });

    this.moyennes[i] = hasValue && totalCoeff > 0
      ? totalPoints / totalCoeff
      : -1;
  }

  /** Enregistre toutes les notes en un seul batch */
  async enregistrerTout(): Promise<void> {
    const eleves      = this.elevesTries();
    const matieres    = this.matieres();
    const seq         = this.ctrlSeq.value!;
    const annee       = new Date().getFullYear().toString();
    const idEnseignant= this.auth.user()?.id ?? '';

    const notes: Note[] = [];

    eleves.forEach((eleve, i) => {
      matieres.forEach((mat, j) => {
        const val = this.notesForm.get(this.ctrlName(i, j))?.value;
        if (val === null || val === '') return; // ne pas sauvegarder les cases vides

        notes.push({
          id_note:        `NOTE-${Date.now()}-${i}-${j}`,
          id_eleve:       eleve.id_eleve,
          id_classe:      eleve.id_classe,
          matiere:        mat.nom_matiere,
          id_enseignant:  idEnseignant,
          sequence:       seq,
          note_obtenue:   +val,
          note_sur:       mat.note_eliminatoire ?? 20,
          annee_scolaire: annee,
        });
      });
    });

    if (notes.length === 0) {
      this.snack.open('Aucune note à enregistrer', '', { duration: 2000 });
      return;
    }

    this.saving.set(true);
    await this.data.saveNotesBatch(notes);
    this.saving.set(false);
    this.dirty.set(false);
    this.snack.open(`${notes.length} note(s) enregistrée(s)`, 'OK', { duration: 3000 });
  }

  /** Ouvre le dialog de transfert pour déplacer un élève vers une autre classe */
  ouvrirTransfert(eleve: Eleve): void {
    this.dialog.open(TransfertEleveDialogComponent, {
      data: { eleve },
      width: '440px',
      maxWidth: '95vw',
    }).afterClosed().subscribe((eleveModifie: Eleve | undefined) => {
      if (eleveModifie) {
        // L'élève a changé de classe → recharge la liste de la classe courante
        this.chargerNotes();
      }
    });
  }
}
