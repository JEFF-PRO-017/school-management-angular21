// paiement-form.component.ts — saisie d'un nouveau paiement
// Le solde est mis à jour localement immédiatement après soumission
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { CacheService } from '../../../core/services/cache.service';
import { DataService } from '../../../core/services/data.service';
import { Paiement } from '../../../core/models';

@Component({
  selector: 'app-paiement-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatDividerModule,
  ],
  template: `
    <div class="container-fluid px-0" style="max-width:600px">

      <div class="d-flex align-items-center gap-2 mb-4">
        <a routerLink="/paiements" mat-icon-button>
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h5 class="fw-bold text-primary mb-0">Nouveau paiement</h5>
      </div>

      <form [formGroup]="form" (ngSubmit)="save()">

        <!-- Sélection élève -->
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-header bg-white fw-semibold">Élève concerné</div>
          <div class="card-body row g-3">

            <div class="col-12">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Rechercher un élève</mat-label>
                <input matInput [formControl]="searchEleve"
                       placeholder="Nom ou prénom…">
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>
            </div>

            <div class="col-12">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Élève *</mat-label>
                <mat-select formControlName="id_eleve"
                            (selectionChange)="onEleveChange($event.value)">
                  @for (e of elevesFiltered(); track e.id_eleve) {
                    <mat-option [value]="e.id_eleve">
                      {{ e.nom }} {{ e.prenom }}
                      — {{ e.classe?.nom_classe }}
                    </mat-option>
                  }
                </mat-select>
                @if (form.controls.id_eleve.invalid && form.controls.id_eleve.touched) {
                  <mat-error>Requis</mat-error>
                }
              </mat-form-field>
            </div>

            <!-- Solde actuel de l'élève sélectionné -->
            @if (soldeActuel()) {
              <div class="col-12">
                <div class="alert py-2 mb-0"
                     [class]="soldeActuel()!.statut_insolvable ? 'alert-warning' : 'alert-success'">
                  <div class="d-flex justify-content-between">
                    <span class="small">Total versé</span>
                    <strong>{{ soldeActuel()!.total_verse.toLocaleString() }} FCFA</strong>
                  </div>
                  <div class="d-flex justify-content-between">
                    <span class="small">Reste à payer</span>
                    <strong class="text-danger">
                      {{ soldeActuel()!.reste_a_payer.toLocaleString() }} FCFA
                    </strong>
                  </div>
                </div>
              </div>
            }

          </div>
        </div>

        <!-- Détails du paiement -->
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-header bg-white fw-semibold">Détails du versement</div>
          <div class="card-body row g-3">

            <div class="col-12 col-md-6">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Montant (FCFA) *</mat-label>
                <input matInput type="number" formControlName="montant_verse" min="0">
                <mat-icon matSuffix>payments</mat-icon>
                @if (form.controls.montant_verse.invalid && form.controls.montant_verse.touched) {
                  <mat-error>Montant requis</mat-error>
                }
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Date *</mat-label>
                <input matInput type="date" formControlName="date_paiement">
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Mode de paiement</mat-label>
                <mat-select formControlName="mode_paiement">
                  <mat-option value="cash">Espèces</mat-option>
                  <mat-option value="mobile">Mobile Money</mat-option>
                  <mat-option value="virement">Virement</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Période concernée</mat-label>
                <input matInput formControlName="periode_concernee"
                       placeholder="ex: Oct 2026">
              </mat-form-field>
            </div>

            <div class="col-12">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Date prochain rendez-vous</mat-label>
                <input matInput type="date" formControlName="date_prochain_rdv">
                <mat-icon matSuffix>event</mat-icon>
              </mat-form-field>
            </div>

            <div class="col-12">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Notes (caissier)</mat-label>
                <textarea matInput formControlName="notes_caissier" rows="2"></textarea>
              </mat-form-field>
            </div>

          </div>
        </div>

        <div class="d-flex gap-2 justify-content-end">
          <a routerLink="/paiements" mat-stroked-button>Annuler</a>
          <button mat-raised-button color="primary"
                  type="submit" [disabled]="form.invalid || saving()">
            <mat-icon>save</mat-icon>
            {{ saving() ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </div>

      </form>
    </div>
  `
})
export class PaiementFormComponent implements OnInit {

  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private cache   = inject(CacheService);
  private data    = inject(DataService);
  private snack   = inject(MatSnackBar);

  saving     = signal(false);
  soldeActuel= signal<any>(null);

  searchEleve = new FormControl('');

  // Élèves filtrés par la recherche
  elevesFiltered = computed(() => {
    const q    = (this.searchEleve.value ?? '').toLowerCase();
    const cMap = this.cache.classesMap();
    const list = (this.cache.getEleves() ?? [])
      .filter(e => e.statut === 'actif')
      .map(e => ({ ...e, classe: cMap.get(e.id_classe) }));
    if (!q) return list;
    return list.filter(e => `${e.nom} ${e.prenom}`.toLowerCase().includes(q));
  });

  form = new FormGroup({
    id_eleve:          new FormControl('', Validators.required),
    montant_verse:     new FormControl<number|null>(null, [Validators.required, Validators.min(1)]),
    date_paiement:     new FormControl(new Date().toISOString().split('T')[0]),
    mode_paiement:     new FormControl('cash'),
    periode_concernee: new FormControl(''),
    date_prochain_rdv: new FormControl(''),
    notes_caissier:    new FormControl(''),
  });

  ngOnInit(): void {
    // Pré-sélectionne l'élève si passé en query param (?eleve=xxx)
    const id = this.route.snapshot.queryParamMap.get('eleve');
    if (id) {
      this.form.controls.id_eleve.setValue(id);
      this.onEleveChange(id);
    }
  }

  /** Affiche le solde quand un élève est sélectionné */
  onEleveChange(idEleve: string): void {
    const s = (this.cache.getSoldes() ?? []).find(x => x.id_eleve === idEleve);
    this.soldeActuel.set(s ?? null);
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);

    const eleve  = (this.cache.getEleves() ?? []).find(
      e => e.id_eleve === this.form.value.id_eleve
    );

    const p: Paiement = {
      id_paiement:           `PAY-${Date.now()}`,
      id_eleve:              this.form.value.id_eleve!,
      id_famille:            eleve?.id_famille ?? '',
      montant_verse:         +(this.form.value.montant_verse ?? 0),
      date_paiement:         this.form.value.date_paiement!,
      mode_paiement:         this.form.value.mode_paiement as any,
      periode_concernee:     this.form.value.periode_concernee ?? '',
      date_prochain_rdv:     this.form.value.date_prochain_rdv ?? '',
      notes_caissier:        this.form.value.notes_caissier ?? '',
      recu_numero:           `RCU-${Date.now()}`,
      statut_alerte_whatsapp:'EN_ATTENTE',
    };

    // addPaiement met à jour le solde local + enfile dans la queue
    await this.data.addPaiement(p);

    this.saving.set(false);
    this.snack.open('Paiement enregistré — reçu ' + p.recu_numero, 'OK', { duration: 4000 });
    this.router.navigate(['/paiements']);
  }
}
