// eleve-form.component.ts — formulaire création/modification d'un élève
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CacheService } from '../../../core/services/cache.service';
import { DataService } from '../../../core/services/data.service';
import { Eleve } from '../../../core/models/last_index';

@Component({
  selector: 'app-eleve-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule,
  ],
  template: `
    <div class="container-fluid px-0" style="max-width:600px">

      <div class="d-flex align-items-center gap-2 mb-4">
        <a routerLink="/eleves" mat-icon-button>
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h5 class="fw-bold text-primary mb-0">
          {{ isEdit ? "Modifier l'élève" : 'Nouvel élève' }}
        </h5>
      </div>

      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-body row g-3">

            <div class="col-12 col-md-6">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Nom *</mat-label>
                <input matInput formControlName="nom">
                @if (form.controls.nom.invalid && form.controls.nom.touched) {
                  <mat-error>Requis</mat-error>
                }
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Prénom *</mat-label>
                <input matInput formControlName="prenom">
                @if (form.controls.prenom.invalid && form.controls.prenom.touched) {
                  <mat-error>Requis</mat-error>
                }
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Date de naissance</mat-label>
                <input matInput type="date" formControlName="date_naissance">
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Famille *</mat-label>
                <mat-select formControlName="id_famille">
                  @for (f of familles(); track f.id_famille) {
                    <mat-option [value]="f.id_famille">{{ f.nom_famille }}</mat-option>
                  }
                </mat-select>
                @if (form.controls.id_famille.invalid && form.controls.id_famille.touched) {
                  <mat-error>Requis</mat-error>
                }
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Classe *</mat-label>
                <mat-select formControlName="id_classe">
                  @for (c of classes(); track c.id_classe) {
                    <mat-option [value]="c.id_classe">{{ c.nom_classe }}</mat-option>
                  }
                </mat-select>
                @if (form.controls.id_classe.invalid && form.controls.id_classe.touched) {
                  <mat-error>Requis</mat-error>
                }
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Statut</mat-label>
                <mat-select formControlName="statut">
                  <mat-option value="actif">Actif</mat-option>
                  <mat-option value="archive">Archivé</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

          </div>
        </div>

        <div class="d-flex gap-2 justify-content-end">
          <a routerLink="/eleves" mat-stroked-button>Annuler</a>
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
export class EleveFormComponent implements OnInit {

  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private cache  = inject(CacheService);
  private data   = inject(DataService);
  private snack  = inject(MatSnackBar);

  isEdit  = false;
  saving  = signal(false);
  private eleveId: string | null = null;

  familles = () => this.cache.getFamilles() ?? [];
  classes  = () => this.cache.getClasses()  ?? [];

  form = new FormGroup({
    nom:             new FormControl('', Validators.required),
    prenom:          new FormControl('', Validators.required),
    date_naissance:  new FormControl(''),
    id_famille:      new FormControl('', Validators.required),
    id_classe:       new FormControl('', Validators.required),
    statut:          new FormControl<'actif'|'archive'>('actif'),
  });

  ngOnInit(): void {
    this.eleveId = this.route.snapshot.paramMap.get('id');
    if (this.eleveId) {
      this.isEdit = true;
      const e = (this.cache.getEleves() ?? []).find(x => x.id_eleve === this.eleveId);
      if (e) this.form.patchValue(e);
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);

    const eleve: Eleve = {
      id_eleve:        this.eleveId ?? `ELV-${Date.now()}`,
      nom:             this.form.value.nom!,
      prenom:          this.form.value.prenom!,
      date_naissance:  this.form.value.date_naissance ?? '',
      id_famille:      this.form.value.id_famille!,
      id_classe:       this.form.value.id_classe!,
      statut:          this.form.value.statut ?? 'actif',
      date_inscription: new Date().toISOString().split('T')[0],
    };

    if (this.isEdit) {
      await this.data.updateEleve(eleve);
    } else {
      await this.data.addEleve(eleve);
    }

    this.saving.set(false);
    this.snack.open('Élève enregistré', 'OK', { duration: 3000 });
    this.router.navigate(['/eleves']);
  }
}
