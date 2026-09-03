// moratoire-form.component.ts
// Page "Créer / Modifier un moratoire" — espace parent (client).
// Le client ne saisit que la date de fin. Le reste (numéro, statut, réglé,
// date de début) est géré côté back-office ou automatiquement.
// La création est protégée par une confirmation explicite (mot à recopier).

import { Component, ChangeDetectionStrategy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FamilleService, Moratoire } from '../../../../core/models';
import { ParentService } from '../../../../core/services';
import { AddServices, PatchServices } from '../../../../core/services/@data';
import { ConfirmWordModalComponent } from '../../components/confirm-word-modal.component';
import { ParentHeaderComponent } from '../../components/parent-header.component';
import { ParentNavbarComponent } from '../../components/parent-navbar.component';
import { MoratoireService } from '../moratoire.service';



@Component({
  selector: 'app-moratoire-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ParentHeaderComponent,
    ParentNavbarComponent,
    ConfirmWordModalComponent,
  ],
  template: `
    <app-parent-header [titre]="isEdition ? 'Modifier le moratoire' : 'Nouveau moratoire'"></app-parent-header>
    <app-parent-navbar></app-parent-navbar>

    <div class="container-fluid p-3">
      <form [formGroup]="form" (ngSubmit)="onSubmit()">

        <div class="mb-3">
          <label class="form-label" for="date_debut">Date début</label>
          <input
            id="date_debut"
            type="date"
            class="form-control"
            formControlName="date_debut">
          <div class="form-text">La date de début correspond à la date du jour et n'est pas modifiable.</div>
        </div>

        <div class="mb-3">
          <label class="form-label" for="date_fin">Date fin</label>
          <input
            id="date_fin"
            type="date"
            class="form-control"
            formControlName="date_fin">
          @if (form.get('date_fin')?.invalid && form.get('date_fin')?.touched) {
            <div class="text-danger small mt-1">La date de fin est requise.</div>
          }
        </div>
             <div class="mb-3">
          <label class="form-label">Commentaire</label>
          <textarea class="form-control" rows="3" formControlName="commentaire"
                    placeholder="Motif ou précisions (optionnel)"></textarea>
        </div>


        <div class="d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-outline-secondary" (click)="onAnnuler()">
            Annuler
          </button>
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid || submitting">
            {{ isEdition ? 'Enregistrer' : 'Créer' }}
          </button>
        </div>

      </form>
    </div>

    <app-confirm-word-modal
      #confirmCreation
      modalId="confirmCreationMoratoire"
      mot="CONFIRMER"
      titre="Confirmer la demande de moratoire"
      message="Cette action enverra votre demande de moratoire à l'administration. Cette opération ne pourra pas être annulée depuis cette interface."
      (confirmed)="onConfirmerCreation()">
    </app-confirm-word-modal>
  `,
})
export class MoratoireFormComponent implements OnInit {
  @ViewChild('confirmCreation') confirmCreation!: ConfirmWordModalComponent;

  form!: FormGroup;
  isEdition = false;
  submitting = false;

  private idMoratoire?: string;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private parentService: ParentService,
    private patchServices: PatchServices,
    private addServices: AddServices,
    private moratoireServices: MoratoireService,
    private familleServices: FamilleService
  ) { }

  ngOnInit(): void {
    this.idMoratoire = this.route.snapshot.paramMap.get('id') ?? undefined;
    this.isEdition = !!this.idMoratoire;

    this.buildForm();

    if (this.isEdition) {
      this.chargerMoratoireExistant();
    }
  }

  private buildForm(): void {
    const today = this.todayAsISODate();

    this.form = this.fb.group({
      // Toujours désactivé : jamais saisissable par le client.
      // Création : figé sur aujourd'hui. Édition : figé sur la valeur d'origine (voir plus bas).
      date_debut: [{ value: today, disabled: true }],
      date_fin: ['', Validators.required],
      commentaire: [''],
    });
  }

  private chargerMoratoireExistant(): void {
    const moratoire = this.getMoratoire();
    if (!moratoire) return;

    this.form.patchValue({
      date_debut: moratoire.date_debut,
      date_fin: moratoire.date_fin,
      commentaire: moratoire.commentaire ?? '',
    });
  }

  getMoratoire(): Moratoire | null {
    const f = this.parentService.famille()
    const moratoires = this.familleServices.initService(f).anneeSvcEncours?.moratoires
    if (!moratoires) return null
    return moratoires.find((m: { id_moratoire: string; }) => m.id_moratoire === this.idMoratoire) as Moratoire | null
  }
  private todayAsISODate(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Soumission du formulaire.
   * - En création : on ne fait rien d'irréversible directement ; on ouvre la modale
   *   de confirmation, l'envoi réel se fait dans onConfirmerCreation().
   * - En édition : enregistrement direct (pas de mot à recopier).
   */
  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.submitting) return;

    if (this.isEdition) {
      await this.enregistrerModification();
    } else {
      this.confirmCreation.open();
    }
  }

  /** Appelé par la modale une fois le mot "CONFIRMER" correctement recopié. */
  async onConfirmerCreation(): Promise<void> {
    if (this.form.invalid || this.submitting) return;
    const f = this.parentService.famille()
    const annee_scolaire = this.familleServices.initService(f).anneeSvcEncours
    if (!annee_scolaire) return

    const payload: Moratoire = this.form.getRawValue();
    const nouveauMoratoire: Moratoire = {
      id_moratoire: this.moratoireServices.generateId(),
      id_famille: f.id_famille,
      id_annee_scolaire: annee_scolaire?.id_annee_scolaire,
      date_debut: payload.date_debut ?? '',
      date_fin: payload.date_fin ?? '',
      commentaire: payload.commentaire ?? '',
      numero_moratoire: `${(annee_scolaire.moratoires?.length ?? 0) + 1}`,
      regler: false,
      statut: 'NON-ACTIF',
    };

    this.submitting = true;
    try {
      await this.addServices.addMoratoire(nouveauMoratoire);
    } finally {
      this.submitting = false;
      this.router.navigate(['/espace-parent/moratoires']);
    }
  }

  private async enregistrerModification(): Promise<void> {
    if (!this.idMoratoire) return;

    const payload: Moratoire = this.form.getRawValue();
    const updateMoratoire: Moratoire = { ...this.getMoratoire(), ...payload }
    this.submitting = true;
    try {
      await this.patchServices.updateMoratoire(updateMoratoire);
      this.router.navigate(['/espace-parent/moratoires']);
    } finally {
      this.submitting = false;
    }
  }

  onAnnuler(): void {
    this.router.navigate(['/espace-parent/moratoires']);
  }
}