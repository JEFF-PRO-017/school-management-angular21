// classe-form.component.ts — formulaire création/modification d'une classe
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DataService } from '../../../core/services/data.service';
import { Classe } from '../../../core/models';

@Component({
  selector: 'app-classe-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule,
  ],
  template: `
    <div class="container-fluid px-0" style="max-width:560px">

      <div class="d-flex align-items-center gap-2 mb-4">
        <a routerLink="/classes" mat-icon-button>
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h5 class="fw-bold text-primary mb-0">
          {{ isEdit ? 'Modifier la classe' : 'Nouvelle classe' }}
        </h5>
      </div>

      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-body row g-3">

            <div class="col-12 col-md-6">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Nom de la classe *</mat-label>
                <input matInput formControlName="nom_classe"
                       placeholder="ex: 6ème A">
                @if (form.controls.nom_classe.invalid && form.controls.nom_classe.touched) {
                  <mat-error>Requis</mat-error>
                }
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Niveau</mat-label>
                <input matInput formControlName="niveau" placeholder="ex: 6ème">
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Cycle *</mat-label>
                <mat-select formControlName="cycle">
                  <mat-option value="primaire">Primaire</mat-option>
                  <mat-option value="secondaire">Secondaire</mat-option>
                  <mat-option value="superieur">Supérieur</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Effectif maximum</mat-label>
                <input matInput type="number" formControlName="effectif_max" min="1">
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
                <mat-label>Enseignant principal</mat-label>
                <mat-select formControlName="enseignant_principal">
                  <mat-option value="">— Aucun —</mat-option>
                  @for (e of enseignants(); track e.id_enseignant) {
                    <mat-option [value]="e.id_enseignant">
                      {{ e.nom }} {{ e.prenom }}
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

          </div>
        </div>

        <div class="d-flex gap-2 justify-content-end">
          <a routerLink="/classes" mat-stroked-button>Annuler</a>
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
export class ClasseFormComponent implements OnInit {

  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private data   = inject(DataService);
  private snack  = inject(MatSnackBar);

  isEdit  = false;
  saving  = signal(false);
  private classeId: string | null = null;

  enseignants = () => this.data.getEnseignants() ?? [];

  form = new FormGroup({
    nom_classe:           new FormControl('', Validators.required),
    niveau:               new FormControl(''),
    cycle:                new FormControl('secondaire', Validators.required),
    effectif_max:         new FormControl(40),
    annee_scolaire:       new FormControl('2025-2026'),
    enseignant_principal: new FormControl(''),
  });

  ngOnInit(): void {
    this.classeId = this.route.snapshot.paramMap.get('id');
    if (this.classeId) {
      this.isEdit = true;
      const c = (this.data.getClasses() ?? []).find(x => x.id_classe === this.classeId);
      if (c) this.form.patchValue(c);
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);

    const classe: Classe = {
      id_classe:           this.classeId ?? `CL-${Date.now()}`,
      nom_classe:          this.form.value.nom_classe!,
      niveau:              this.form.value.niveau ?? '',
      cycle:               this.form.value.cycle as any,
      effectif_max:        +(this.form.value.effectif_max ?? 40),
      annee_scolaire:      this.form.value.annee_scolaire ?? '2025-2026',
      enseignant_principal:this.form.value.enseignant_principal ?? '',
    };

    if (this.isEdit) {
      await this.data.updateClasse(classe);
    } else {
      await this.data.addClasse(classe);
    }

    this.saving.set(false);
    this.snack.open('Classe enregistrée', 'OK', { duration: 3000 });
    this.router.navigate(['/classes']);
  }
}
