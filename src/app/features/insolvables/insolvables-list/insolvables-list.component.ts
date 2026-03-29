// insolvables-list.component.ts
// Liste des élèves insolvables avec :
// - Filtre par classe + seuil personnalisable
// - Export PDF de la liste
// - Déclenchement d'alerte WhatsApp par élève ou en masse
import { Component, inject, signal, computed } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CacheService } from '../../../core/services/cache.service';
import { DataService } from '../../../core/services/data.service';
import { PdfService } from '../../../core/services/pdf.service';
import { WhatsappService } from '../../../core/services/whatsapp.service';
import { EleveEnrichi, SoldeSnap } from '../../../core/models';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

type InsolvableRow = EleveEnrichi & { solde: SoldeSnap };

@Component({
  selector: 'app-insolvables-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatTooltipModule, MatProgressSpinnerModule, MatCheckboxModule,
    EmptyStateComponent,
  ],
  template: `
    <div class="container-fluid px-0">

      <!-- Titre + actions globales -->
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h5 class="fw-bold text-primary mb-0">Élèves insolvables</h5>
          <p class="text-muted small mb-0">
            {{ insolvables().length }} élève(s) concerné(s)
          </p>
        </div>

        <div class="d-flex flex-wrap gap-2">
          <!-- Alerte WhatsApp en masse pour les sélectionnés -->
          @if (selection().length > 0) {
            <button mat-raised-button color="warn"
                    (click)="envoyerAlerteMasse()"
                    [disabled]="sending()">
              @if (sending()) {
                <mat-spinner diameter="18" class="d-inline-block me-1"></mat-spinner>
              } @else {
                <mat-icon>send</mat-icon>
              }
              Alerter {{ selection().length }} parent(s)
            </button>
          }

          <!-- Export PDF -->
          <button mat-stroked-button color="primary" (click)="exporterPdf()">
            <mat-icon>picture_as_pdf</mat-icon> Exporter PDF
          </button>
        </div>
      </div>

      <!-- Filtres -->
      <div class="row g-2 mb-3">
        <div class="col-12 col-md-4">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Filtrer par classe</mat-label>
            <mat-select [formControl]="filterClasse">
              <mat-option value="">Toutes les classes</mat-option>
              @for (c of classes(); track c.id_classe) {
                <mat-option [value]="c.id_classe">{{ c.nom_classe }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <div class="col-12 col-md-4">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Reste minimum (FCFA)</mat-label>
            <input matInput type="number" [formControl]="filterMontantMin" min="0">
            <mat-icon matSuffix>filter_alt</mat-icon>
          </mat-form-field>
        </div>

        <div class="col-12 col-md-4">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Date de référence</mat-label>
            <input matInput type="date" [formControl]="dateRef">
          </mat-form-field>
        </div>
      </div>

      <!-- Tableau -->
      @if (insolvables().length === 0) {
        <app-empty-state
          icon="check_circle"
          title="Aucun insolvable"
          subtitle="Tous les élèves sont à jour pour les critères sélectionnés">
        </app-empty-state>
      } @else {

        <!-- Ligne de sélection globale -->
        <div class="d-flex align-items-center gap-2 mb-2">
          <mat-checkbox
            [checked]="allSelected()"
            [indeterminate]="someSelected()"
            (change)="toggleAll($event.checked)">
            Tout sélectionner
          </mat-checkbox>
          <span class="text-muted small">
            {{ selection().length }} / {{ insolvables().length }} sélectionné(s)
          </span>
        </div>

        <div class="table-responsive rounded shadow-sm">
          <table mat-table [dataSource]="insolvables()" class="w-100 mat-elevation-z0">

            <!-- Case à cocher -->
            <ng-container matColumnDef="select">
              <th mat-header-cell *matHeaderCellDef style="width:48px"></th>
              <td mat-cell *matCellDef="let row">
                <mat-checkbox
                  [checked]="isSelected(row.id_eleve)"
                  (change)="toggleSelect(row.id_eleve, $event.checked)">
                </mat-checkbox>
              </td>
            </ng-container>

            <!-- Élève -->
            <ng-container matColumnDef="eleve">
              <th mat-header-cell *matHeaderCellDef>Élève</th>
              <td mat-cell *matCellDef="let row">
                <div class="fw-semibold">{{ row.nom }} {{ row.prenom }}</div>
                <div class="text-muted small">{{ row.famille?.nom_famille }}</div>
              </td>
            </ng-container>

            <!-- Classe -->
            <ng-container matColumnDef="classe">
              <th mat-header-cell *matHeaderCellDef>Classe</th>
              <td mat-cell *matCellDef="let row">
                <span class="badge bg-primary-subtle text-primary">
                  {{ row.classe?.nom_classe ?? '—' }}
                </span>
              </td>
            </ng-container>

            <!-- Contacts -->
            <ng-container matColumnDef="contacts">
              <th mat-header-cell *matHeaderCellDef class="d-none d-md-table-cell">
                Contacts
              </th>
              <td mat-cell *matCellDef="let row" class="d-none d-md-table-cell">
                <div class="small">
                  <mat-icon style="font-size:13px;vertical-align:middle">phone</mat-icon>
                  Père : {{ row.famille?.tel_pere || '—' }}
                </div>
                <div class="small text-muted">
                  Mère : {{ row.famille?.tel_mere || '—' }}
                </div>
              </td>
            </ng-container>

            <!-- Montants -->
            <ng-container matColumnDef="montants">
              <th mat-header-cell *matHeaderCellDef>Situation</th>
              <td mat-cell *matCellDef="let row">
                <div class="small text-muted">
                  Versé : {{ row.solde.total_verse.toLocaleString() }} FCFA
                </div>
                <div class="fw-semibold text-danger">
                  Reste : {{ row.solde.reste_a_payer.toLocaleString() }} FCFA
                </div>
                @if (row.solde.dernier_paiement) {
                  <div class="small text-muted">
                    Dernier : {{ row.solde.dernier_paiement }}
                  </div>
                }
              </td>
            </ng-container>

            <!-- Actions par ligne -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let row">
                <div class="d-flex flex-column flex-md-row gap-1 justify-content-end">
                  <!-- WhatsApp père -->
                  @if (row.famille?.tel_pere) {
                    <button mat-icon-button color="primary"
                            matTooltip="Alerter le père"
                            (click)="envoyerAlerte(row, 'pere')">
                      <mat-icon>send</mat-icon>
                    </button>
                  }
                  <!-- WhatsApp mère -->
                  @if (row.famille?.tel_mere) {
                    <button mat-icon-button color="accent"
                            matTooltip="Alerter la mère"
                            (click)="envoyerAlerte(row, 'mere')">
                      <mat-icon>send</mat-icon>
                    </button>
                  }
                  <!-- PDF individuel -->
                  <button mat-icon-button
                          matTooltip="Exporter fiche PDF"
                          (click)="exporterPdfIndividuel(row)">
                    <mat-icon>picture_as_pdf</mat-icon>
                  </button>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols"
                [class.table-warning]="row.solde.reste_a_payer > 50000">
            </tr>
          </table>
        </div>

        <!-- Totaux récapitulatifs -->
        <div class="card border-0 shadow-sm mt-3">
          <div class="card-body d-flex flex-wrap gap-4">
            <div>
              <div class="text-muted small">Total attendu</div>
              <div class="fw-bold fs-6">
                {{ totalAttendu().toLocaleString() }} FCFA
              </div>
            </div>
            <div>
              <div class="text-muted small">Total versé</div>
              <div class="fw-bold fs-6 text-success">
                {{ totalVerse().toLocaleString() }} FCFA
              </div>
            </div>
            <div>
              <div class="text-muted small">Total restant</div>
              <div class="fw-bold fs-6 text-danger">
                {{ totalRestant().toLocaleString() }} FCFA
              </div>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class InsolvablesListComponent {

  private cache    = inject(CacheService);
  private pdf      = inject(PdfService);
  private whatsapp = inject(WhatsappService);
  private snack    = inject(MatSnackBar);

  cols = ['select', 'eleve', 'classe', 'contacts', 'montants', 'actions'];

  // Filtres
  filterClasse    = new FormControl('');
  filterMontantMin= new FormControl(0);
  dateRef         = new FormControl(new Date().toISOString().split('T')[0]);

  sending   = signal(false);
  // IDs des élèves sélectionnés pour alerte en masse
  selection = signal<string[]>([]);

  classes = computed(() => this.cache.getClasses() ?? []);

  // Liste insolvables filtrée
  insolvables = computed<InsolvableRow[]>(() => {
    const classeId  = this.filterClasse.value ?? '';
    const montMin   = +(this.filterMontantMin.value ?? 0);
    const fMap      = this.cache.famillesMap();
    const cMap      = this.cache.classesMap();
    const soldes    = this.cache.getSoldes() ?? [];

    return (this.cache.getEleves() ?? [])
      .filter(e => e.statut === 'actif')
      .filter(e => !classeId || e.id_classe === classeId)
      .map(e => {
        const solde = soldes.find(s => s.id_eleve === e.id_eleve);
        return solde ? {
          ...e,
          famille: fMap.get(e.id_famille),
          classe:  cMap.get(e.id_classe),
          solde,
        } as InsolvableRow : null;
      })
      .filter((r): r is InsolvableRow =>
        r !== null &&
        r.solde.statut_insolvable &&
        r.solde.reste_a_payer >= montMin
      )
      // Tri : plus gros restant en premier
      .sort((a, b) => b.solde.reste_a_payer - a.solde.reste_a_payer);
  });

  // Totaux
  totalAttendu = computed(() =>
    this.insolvables().reduce((s, r) => s + r.solde.montant_attendu, 0));
  totalVerse   = computed(() =>
    this.insolvables().reduce((s, r) => s + r.solde.total_verse, 0));
  totalRestant = computed(() =>
    this.insolvables().reduce((s, r) => s + r.solde.reste_a_payer, 0));

  // ── Sélection ────────────────────────────────

  isSelected(id: string):  boolean { return this.selection().includes(id); }
  allSelected():  boolean  { return this.insolvables().length > 0 && this.selection().length === this.insolvables().length; }
  someSelected(): boolean  { return this.selection().length > 0 && !this.allSelected(); }

  toggleSelect(id: string, checked: boolean): void {
    this.selection.update(s =>
      checked ? [...s, id] : s.filter(x => x !== id)
    );
  }

  toggleAll(checked: boolean): void {
    this.selection.set(checked ? this.insolvables().map(r => r.id_eleve) : []);
  }

  // ── Export PDF ───────────────────────────────

  exporterPdf(): void {
    const nomClasse = this.classes().find(
      c => c.id_classe === this.filterClasse.value
    )?.nom_classe ?? 'Toutes';

    this.pdf.genererInsolvables(
      this.insolvables(),
      nomClasse,
      this.dateRef.value ?? new Date().toISOString().split('T')[0]
    );
  }

  exporterPdfIndividuel(row: InsolvableRow): void {
    // Génère un PDF d'une seule ligne (réutilise le même service)
    this.pdf.genererInsolvables(
      [row],
      row.classe?.nom_classe ?? '',
      this.dateRef.value ?? ''
    );
  }

  // ── Alertes WhatsApp ─────────────────────────

  /** Envoie une alerte à un parent d'un élève spécifique */
  async envoyerAlerte(row: InsolvableRow, dest: 'pere' | 'mere'): Promise<void> {
    const tel = dest === 'pere'
      ? row.famille?.tel_pere
      : row.famille?.tel_mere;

    if (!tel) {
      this.snack.open('Numéro non disponible', '', { duration: 2000 });
      return;
    }

    await this.whatsapp.envoyerRappelInsolvable(row, tel);
    this.snack.open('Alerte envoyée à ' + tel, 'OK', { duration: 3000 });
  }

  /** Envoie une alerte en masse pour tous les sélectionnés */
  async envoyerAlerteMasse(): Promise<void> {
    const ids     = this.selection();
    const cibles  = this.insolvables().filter(r => ids.includes(r.id_eleve));
    if (!cibles.length) return;

    this.sending.set(true);
    let ok = 0;

    for (const row of cibles) {
      const tel = row.famille?.tel_pere ?? row.famille?.tel_mere ?? '';
      if (tel) {
        await this.whatsapp.envoyerRappelInsolvable(row, tel);
        ok++;
      }
    }

    this.sending.set(false);
    this.selection.set([]);
    this.snack.open(`${ok} alerte(s) envoyée(s)`, 'OK', { duration: 3000 });
  }
}
