// template-form.component.ts — création/modification d'un template WhatsApp
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SheetsQueueServiceService } from '../../../core/services/sheets-queue.service';
import { MsgTemplate } from '../../../core/models';

@Component({
  selector: 'app-template-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatSlideToggleModule,
  ],
  template: `
    <div class="container-fluid px-0" style="max-width:640px">

      <div class="d-flex align-items-center gap-2 mb-4">
        <a routerLink="/whatsapp" mat-icon-button>
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h5 class="fw-bold text-primary mb-0">
          {{ isEdit ? 'Modifier le template' : 'Nouveau template' }}
        </h5>
      </div>

      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-body row g-3">

            <div class="col-12">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Objet (titre court) *</mat-label>
                <input matInput formControlName="objet">
                @if (form.controls.objet.invalid && form.controls.objet.touched) {
                  <mat-error>Requis</mat-error>
                }
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Type de message *</mat-label>
                <mat-select formControlName="type">
                  <mat-option value="rappel">Rappel paiement</mat-option>
                  <mat-option value="rdv">Rendez-vous</mat-option>
                  <mat-option value="bulletin">Bulletin</mat-option>
                  <mat-option value="relance">Relance insolvable</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Destinataire</mat-label>
                <mat-select formControlName="destinataire">
                  <mat-option value="pere">Père uniquement</mat-option>
                  <mat-option value="mere">Mère uniquement</mat-option>
                  <mat-option value="les_deux">Père et mère</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="col-12 col-md-4">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Langue</mat-label>
                <mat-select formControlName="langue">
                  <mat-option value="fr">Français</mat-option>
                  <mat-option value="en">Anglais</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="col-12 col-md-8 d-flex align-items-center">
              <mat-slide-toggle formControlName="actif" color="primary">
                Activer ce template
              </mat-slide-toggle>
            </div>

            <!-- Contenu du message avec aide variables -->
            <div class="col-12">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Contenu du message *</mat-label>
                <textarea matInput formControlName="contenu" rows="5"
                          placeholder="Bonjour, le solde de {{ '{nom_eleve}' }} est de {{ '{montant}' }} FCFA...">
                </textarea>
                <mat-hint>
                  Variables : {{ '{nom_eleve}' }} {{ '{montant}' }} {{ '{date}' }} {{ '{classe}' }} {{ '{nom_famille}' }}
                </mat-hint>
                @if (form.controls.contenu.invalid && form.controls.contenu.touched) {
                  <mat-error>Le contenu est requis</mat-error>
                }
              </mat-form-field>
            </div>

            <!-- Aperçu du message interpolé -->
            @if (apercu()) {
              <div class="col-12">
                <div class="small fw-semibold text-muted mb-1">Aperçu</div>
                <div class="bg-success-subtle rounded p-3 small">
                  {{ apercu() }}
                </div>
              </div>
            }

          </div>
        </div>

        <div class="d-flex gap-2 justify-content-end">
          <a routerLink="/whatsapp" mat-stroked-button>Annuler</a>
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
export class TemplateFormComponent implements OnInit {

  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private queue  = inject(SheetsQueueServiceService);
  private snack  = inject(MatSnackBar);

  isEdit  = false;
  saving  = signal(false);
  private tplId: string | null = null;

  form = new FormGroup({
    objet:        new FormControl('', Validators.required),
    type:         new FormControl('rappel'),
    destinataire: new FormControl('les_deux'),
    langue:       new FormControl('fr'),
    actif:        new FormControl(true),
    contenu:      new FormControl('', Validators.required),
  });

  // Aperçu avec variables de démo remplacées
  apercu = () => {
    const c = this.form.value.contenu ?? '';
    if (!c) return '';
    return c
      .replaceAll('{nom_eleve}',   'Jean Dupont')
      .replaceAll('{montant}',     '25 000')
      .replaceAll('{date}',        'janvier 2026')
      .replaceAll('{classe}',      '3ème B')
      .replaceAll('{nom_famille}', 'Famille Dupont');
  };

  ngOnInit(): void {
    this.tplId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.tplId;
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);

    const tpl: MsgTemplate = {
      id_template:  this.tplId ?? `TPL-${Date.now()}`,
      objet:        this.form.value.objet!,
      type:         this.form.value.type as any,
      destinataire: this.form.value.destinataire as any,
      langue:       this.form.value.langue ?? 'fr',
      actif:        this.form.value.actif ?? true,
      contenu:      this.form.value.contenu!,
    };

    const row = [
      tpl.id_template, tpl.type, tpl.objet,
      tpl.contenu, '', tpl.actif ? 'OUI' : 'NON', tpl.langue, tpl.destinataire,
    ];

    this.queue.enqueue({ sheetName: 'F7_MSG_TEMPLATES', rowData: row }, 'addRow');

    this.saving.set(false);
    this.snack.open('Template enregistré', 'OK', { duration: 3000 });
    this.router.navigate(['/whatsapp']);
  }
}
