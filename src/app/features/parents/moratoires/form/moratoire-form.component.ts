// moratoire-form.component.ts
// Page "Créer / Modifier un moratoire" — espace parent.
// Route : /espace-parent/moratoires/create (création)
//         /espace-parent/moratoires/:id     (modification)
//
// Formulaire HTML simple avec ReactiveFormsModule + validateurs Angular natifs.
// Une modale de confirmation (recopie du mot "CONFIRMER") s'affiche avant l'envoi.
//
// ⚠️ Ajuste les chemins d'import selon ton arborescence réelle.

import { Component, ChangeDetectionStrategy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Moratoire } from '../../../../core/models';
import { SessionService } from '../../../../core/services/@session/session.service';
import { ConfirmWordModalComponent } from '../../components/confirm-word-modal.component';
import { ParentHeaderComponent } from '../../components/parent-header.component';
import { MoratoireService } from '../moratoire.service';



/** Validateur custom : la date de fin doit être postérieure à la date de début. */
function dateFinApresDebutValidator(group: AbstractControl): ValidationErrors | null {
  const debut = group.get('date_debut')?.value;
  const fin = group.get('date_fin')?.value;
  if (!debut || !fin) return null;
  return new Date(fin) > new Date(debut) ? null : { dateFinInvalide: true };
}

@Component({
  selector: 'app-moratoire-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, ParentHeaderComponent, ConfirmWordModalComponent],
  template: `
    <app-parent-header [titre]="modeEdition ? 'Modifier le moratoire' : 'Nouveau moratoire'"></app-parent-header>

    <div class="container-fluid p-3" style="max-width:640px">

      <form [formGroup]="form" (ngSubmit)="onDemanderConfirmation()" novalidate>

        <div class="mb-3">
          <label class="form-label">Date de début <span class="text-danger">*</span></label>
          <input type="date" class="form-control" formControlName="date_debut"
                 [class.is-invalid]="isInvalid('date_debut')">
          @if (isInvalid('date_debut')) {
            <div class="invalid-feedback">La date de début est obligatoire.</div>
          }
        </div>

        <div class="mb-3">
          <label class="form-label">Date de fin <span class="text-danger">*</span></label>
          <input type="date" class="form-control" formControlName="date_fin"
                 [class.is-invalid]="isInvalid('date_fin')">
          @if (isInvalid('date_fin')) {
            <div class="invalid-feedback">La date de fin est obligatoire.</div>
          }
          @if (form.errors?.['dateFinInvalide'] && form.get('date_fin')?.touched) {
            <div class="text-danger small mt-1">La date de fin doit être postérieure à la date de début.</div>
          }
        </div>

        <div class="mb-3">
          <label class="form-label">Commentaire</label>
          <textarea class="form-control" rows="3" formControlName="commentaire"
                    placeholder="Motif ou précisions (optionnel)"></textarea>
        </div>

        @if (erreurEnvoi) {
          <div class="alert alert-danger py-2">{{ erreurEnvoi }}</div>
        }

        <div class="d-flex gap-2 justify-content-end mt-4">
          <button type="button" class="btn btn-outline-secondary" (click)="onAnnuler()">
            Annuler
          </button>
          <button type="button" class="btn btn-primary" [disabled]="form.invalid || envoiEnCours" (click)="onDemanderConfirmation()">
            @if (envoiEnCours) {
              <span class="spinner-border spinner-border-sm me-1"></span>
            }
            {{ modeEdition ? 'Enregistrer' : 'Envoyer la demande' }}
          </button>
        </div>

      </form>
    </div>

    <app-confirm-word-modal
      #confirmEnvoi
      modalId="confirmEnvoiMoratoire"
      mot="CONFIRMER"
      titre="Confirmer la demande de moratoire"
      message="Cette action enverra votre demande à l'administration."
      (confirmed)="onConfirmerEnvoi()">
    </app-confirm-word-modal>
  `,
})
export class MoratoireFormComponent implements OnInit {
  @ViewChild('confirmEnvoi') confirmEnvoi!: ConfirmWordModalComponent;

  form: FormGroup;
  modeEdition = false;
  private idMoratoire?: string;

  envoiEnCours = false;
  erreurEnvoi = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private moratoireService: MoratoireService,
    private sessionService: SessionService,
  ) {
    this.form = this.fb.group(
      {
        date_debut: ['', Validators.required],
        date_fin: ['', Validators.required],
        commentaire: [''],
      },
      { validators: dateFinApresDebutValidator }
    );
  }

  ngOnInit(): void {
    this.idMoratoire = this.route.snapshot.paramMap.get('id') ?? undefined;
    if (this.idMoratoire) {
      this.modeEdition = true;
      const existant = this.moratoireService.getMoratoireById(this.idMoratoire);
      if (existant) {
        this.form.patchValue({
          date_debut: existant.date_debut,
          date_fin: existant.date_fin,
          commentaire: existant.commentaire ?? '',
        });
      }
    }
  }

  isInvalid(controlName: string): boolean {
    const c = this.form.get(controlName);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  onAnnuler(): void {
    this.router.navigate(['/espace-parent/moratoires']);
  }

  /** Marque les champs comme touchés puis ouvre la modale de confirmation. */
  onDemanderConfirmation(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.erreurEnvoi = '';
    this.confirmEnvoi.open();
  }

  /** Appelé après confirmation du mot dans la modale : envoi réel. */
  async onConfirmerEnvoi(): Promise<void> {
    this.envoiEnCours = true;
    this.erreurEnvoi = '';

    try {
      const valeurs = this.form.value;

      if (this.modeEdition && this.idMoratoire) {
        const existant = this.moratoireService.getMoratoireById(this.idMoratoire);
        if (!existant) throw new Error('Moratoire introuvable.');

        const moratoireMisAJour: Moratoire = {
          ...existant,
          date_debut: valeurs.date_debut,
          date_fin: valeurs.date_fin,
          commentaire: valeurs.commentaire || undefined,
        };
        await this.moratoireService.updateMoratoire(moratoireMisAJour);
      } else {
        const nouveauMoratoire: Moratoire = {
          id_moratoire: this.moratoireService.generateId(),
          id_famille: this.sessionService.get()?.id_famille ?? '',
          id_annee_scolaire: '', // TODO: renseigner selon l'année scolaire active (aucune source disponible ici)
          date_debut: valeurs.date_debut ?? '',
          date_fin: valeurs.date_fin ?? '',
          commentaire: valeurs.commentaire || undefined,
          regler: false,
          statut: 'ACTIF',
        };
        await this.moratoireService.createMoratoire(nouveauMoratoire);
      }

      this.router.navigate(['/espace-parent/moratoires']);
    } catch (err) {
      this.erreurEnvoi = "Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.";
    } finally {
      this.envoiEnCours = false;
    }
  }
}