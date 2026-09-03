// confirm-word-modal.component.ts
// Modale de confirmation réutilisable : l'utilisateur doit recopier fidèlement
// un mot donné pour activer le bouton de confirmation. Utilisée avant tout
// envoi sensible (création de moratoire, initiation de paiement, etc.).
//
// Usage :
//   <app-confirm-word-modal
//     #confirmModal
//     modalId="confirmMoratoire"
//     mot="CONFIRMER"
//     titre="Confirmer la demande de moratoire"
//     message="Cette action enverra votre demande à l'administration."
//     (confirmed)="onConfirmed()" />
//
// Ouverture depuis le composant parent :
//   this.confirmModal.open();
//
// Nécessite le bundle JS de Bootstrap (déjà utilisé pour le dropdown du header).

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

declare const bootstrap: any;

@Component({
  selector: 'app-confirm-word-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal fade" [id]="modalId" tabindex="-1" [attr.aria-labelledby]="modalId + 'Label'" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" [id]="modalId + 'Label'">{{ titre }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer" (click)="reset()"></button>
          </div>
          <div class="modal-body">
            <p>{{ message }}</p>
            <p class="mb-2">
              Pour confirmer, recopiez exactement le mot :
              <span class="fw-bold text-primary">{{ mot }}</span>
            </p>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="saisie"
              autocomplete="off"
              placeholder="Recopiez le mot ici">
            @if (saisie && !motValide) {
              <div class="text-danger small mt-1">Le mot ne correspond pas exactement.</div>
            }
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal" (click)="reset()">
              Annuler
            </button>
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="!motValide"
              (click)="confirmer()">
              Confirmer
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmWordModalComponent {
  /** Identifiant HTML unique de la modale (nécessaire si plusieurs modales sur la même page). */
  @Input({ required: true }) modalId!: string;

  /** Mot exact que l'utilisateur doit recopier. */
  @Input() mot = 'CONFIRMER';

  @Input() titre = 'Confirmation requise';
  @Input() message = 'Merci de confirmer cette action avant de continuer.';

  /** Émis lorsque l'utilisateur a validé le mot et cliqué sur Confirmer. */
  @Output() confirmed = new EventEmitter<void>();

  @ViewChild('modalRoot') private modalRoot?: ElementRef<HTMLDivElement>;

  saisie = '';

  get motValide(): boolean {
    return this.saisie.trim() === this.mot.trim();
  }

  /** Ouvre la modale depuis le composant parent (via @ViewChild). */
  open(): void {
    const el = document.getElementById(this.modalId);
    if (!el) return;
    const instance = bootstrap.Modal.getOrCreateInstance(el);
    instance.show();
  }

  private close(): void {
    const el = document.getElementById(this.modalId);
    if (!el) return;
    const instance = bootstrap.Modal.getOrCreateInstance(el);
    instance.hide();
  }

  confirmer(): void {
    if (!this.motValide) return;
    this.confirmed.emit();
    this.close();
    this.reset();
  }

  reset(): void {
    this.saisie = '';
  }
}