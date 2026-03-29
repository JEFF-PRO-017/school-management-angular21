// frais-form.component.ts — formulaire création/modification d'une config de frais
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CacheService } from '../../../core/services/cache.service';
import { SheetsQueueServiceService } from '../../../core/services/sheets-queue.service';
import { FraisConfig } from '../../../core/models';

@Component({
  selector: 'app-frais-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule,
  ],
  template: `
    <div class="container-fluid px-0" style="max-width:600px">

      <div class="d-flex align-items-center gap-2 mb-4">
        <a routerLink="/frais" mat-icon-button>
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h5 class="fw-bold text-primary mb-0">
          {{ isEdit ? 'Modifier les frais' : 'Nouveaux frais' }}
        </h5>
      </div>

      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-body row g-3">

            <div class="col-12">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Classe *</mat-label>
                <mat-select formControlName="id_classe">
                  @for (c of classes(); track c.id_classe) {
                    <mat-option [value]="c.id_classe">{{ c.nom_classe }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Type de frais *</mat-label>
                <input matInput formControlName="type_frais"
                       placeholder="ex: Frais de scolarité">
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Année scolaire</mat-label>
                <input matInput formControlName="annee_scolaire"
                       placeholder="ex: 2025-2026">
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Montant total attendu (FCFA) *</mat-label>
                <input matInput type="number" formControlName="montant_total_attendu" min="0">
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Seuil insolvable (FCFA)</mat-label>
                <input matInput type="number" formControlName="seuil_insolvable" min="0">
                <mat-hint>Montant restant à partir duquel l'élève est insolvable</mat-hint>
              </mat-form-field>
            </div>

            <!-- Échéances -->
            <div class="col-12">
              <div class="fw-semibold small text-muted mb-2">Dates d'échéance (optionnel)</div>
              <div class="row g-2">
                <div class="col-12 col-md-4">
                  <mat-form-field class="w-100" appearance="outline">
                    <mat-label>Échéance 1</mat-label>
                    <input matInput type="date" formControlName="echeance_1">
                  </mat-form-field>
                </div>
                <div class="col-12 col-md-4">
                  <mat-form-field class="w-100" appearance="outline">
                    <mat-label>Échéance 2</mat-label>
                    <input matInput type="date" formControlName="echeance_2">
                  </mat-form-field>
                </div>
                <div class="col-12 col-md-4">
                  <mat-form-field class="w-100" appearance="outline">
                    <mat-label>Échéance 3</mat-label>
                    <input matInput type="date" formControlName="echeance_3">
                  </mat-form-field>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div class="d-flex gap-2 justify-content-end">
          <a routerLink="/frais" mat-stroked-button>Annuler</a>
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
export class FraisFormComponent implements OnInit {

  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private cache  = inject(CacheService);
  private queue  = inject(SheetsQueueServiceService);
  private snack  = inject(MatSnackBar);

  isEdit  = false;
  saving  = signal(false);
  private fraisId: string | null = null;

  classes = computed(() => this.cache.getClasses() ?? []);

  form = new FormGroup({
    id_classe:            new FormControl('', Validators.required),
    type_frais:           new FormControl('Frais de scolarité', Validators.required),
    annee_scolaire:       new FormControl('2025-2026'),
    montant_total_attendu:new FormControl<number|null>(null, [Validators.required, Validators.min(0)]),
    seuil_insolvable:     new FormControl<number>(0),
    echeance_1:           new FormControl(''),
    echeance_2:           new FormControl(''),
    echeance_3:           new FormControl(''),
  });

  ngOnInit(): void {
    this.fraisId = this.route.snapshot.paramMap.get('id');
    if (this.fraisId) {
      this.isEdit = true;
      const f = (this.cache.getFrais() ?? []).find(x => x.id_frais === this.fraisId);
      if (f) this.form.patchValue(f as any);
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);

    const frais: FraisConfig = {
      id_frais:             this.fraisId ?? `FRX-${Date.now()}`,
      id_classe:            this.form.value.id_classe!,
      type_frais:           this.form.value.type_frais!,
      annee_scolaire:       this.form.value.annee_scolaire ?? '',
      montant_total_attendu:+(this.form.value.montant_total_attendu ?? 0),
      seuil_insolvable:     +(this.form.value.seuil_insolvable ?? 0),
      echeance_1:           this.form.value.echeance_1 ?? '',
      echeance_2:           this.form.value.echeance_2 ?? '',
      echeance_3:           this.form.value.echeance_3 ?? '',
    };

    // Mise à jour cache locale
    const all = this.cache.getFrais() ?? [];
    const idx = all.findIndex(x => x.id_frais === frais.id_frais);
    this.cache.setFrais(
      idx === -1 ? [...all, frais] : all.map((x, i) => i === idx ? frais : x)
    );

    // Envoi en file
    const row = [
      frais.id_frais, frais.id_classe, frais.type_frais,
      frais.montant_total_attendu, frais.seuil_insolvable,
      frais.echeance_1, frais.echeance_2, frais.echeance_3,
      frais.annee_scolaire,
    ];
    this.queue.enqueue({ sheetName: 'F5_FRAIS_CONFIG', rowData: row }, 'addRow');

    this.saving.set(false);
    this.snack.open('Configuration enregistrée', 'OK', { duration: 3000 });
    this.router.navigate(['/frais']);
  }
}
