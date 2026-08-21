// shared/components/whatsapp-modal/whatsapp-modal.component.ts
import { Component, inject, signal, ViewChild, ElementRef, computed } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { WhatsappService } from '../../../core/services/@whatsapp/whatsapp.service';


export interface WhatsappVariable {
  label:  string;
  valeur: string;
}

export interface WhatsappModalData {
  telPere?: string;
  telMere?: string;
  messageDefaut: string;
  variables?: WhatsappVariable[];
}

@Component({
  selector: 'app-whatsapp-modal',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule],
  template: `
<div style="width:100%;max-width:560px">

  <div class="d-flex align-items-center justify-content-between px-3 py-3 border-bottom">
    <div class="fw-semibold">Envoyer un message WhatsApp</div>
    <button class="btn-close" (click)="fermer()"></button>
  </div>

  <div class="px-3 py-3 d-flex flex-column gap-3">

    <div>
      <label class="form-label small mb-1">Destinataire(s)</label>
      <div class="d-flex flex-column gap-1">
        @if (data.telPere) {
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="chkPere"
                   [checked]="envoiPere()" (change)="envoiPere.set(!envoiPere())">
            <label class="form-check-label" for="chkPere">
              Père — <span class="text-muted">{{ data.telPere }}</span>
              @if (statutEnvoi().pere) { <span class="text-success ms-1">✓</span> }
            </label>
          </div>
        }
        @if (data.telMere) {
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="chkMere"
                   [checked]="envoiMere()" (change)="envoiMere.set(!envoiMere())">
            <label class="form-check-label" for="chkMere">
              Mère — <span class="text-muted">{{ data.telMere }}</span>
              @if (statutEnvoi().mere) { <span class="text-success ms-1">✓</span> }
            </label>
          </div>
        }
        @if (!data.telPere && !data.telMere) {
          <div class="text-muted small">Aucun numéro disponible pour cette famille</div>
        }
      </div>
    </div>

    @if (data.variables?.length) {
      <div>
        <label class="form-label small mb-1">Insérer une valeur</label>
        <div class="d-flex flex-wrap gap-1">
          @for (v of data.variables; track v.label) {
            <button type="button" class="btn btn-sm btn-outline-secondary"
                    (click)="inserer(v.valeur)">{{ v.label }}</button>
          }
        </div>
      </div>
    }

    <div>
      <label class="form-label small mb-1">Message</label>
      <textarea #messageInput class="form-control form-control-sm" rows="5"
                [formControl]="message"></textarea>
    </div>

  </div>

  <div class="d-flex justify-content-end gap-2 px-3 py-2 border-top">
    <button class="btn btn-sm btn-outline-secondary" (click)="fermer()">Fermer</button>
    <button class="btn btn-sm btn-primary" [disabled]="envoiEnCours() || !aUneDestination()" (click)="envoyer()">
      {{ envoiEnCours() ? 'Envoi…' : 'Envoyer' }}
    </button>
  </div>

</div>
  `
})
export class WhatsappModalComponent {

  readonly data     = inject<WhatsappModalData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<WhatsappModalComponent>);
  private whatsapp  = inject(WhatsappService);

  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;

  message = new FormControl(this.data.messageDefaut ?? '');

  envoiPere = signal(!!this.data.telPere);
  envoiMere = signal(!!this.data.telMere && !this.data.telPere);

  envoiEnCours = signal(false);
  statutEnvoi  = signal<{ pere: boolean; mere: boolean }>({ pere: false, mere: false });

  aUneDestination = computed(() => this.envoiPere() || this.envoiMere());

  inserer(valeur: string): void {
    const el  = this.messageInput.nativeElement;
    const pos = el.selectionStart ?? (this.message.value ?? '').length;
    const txt = this.message.value ?? '';
    this.message.setValue(txt.slice(0, pos) + valeur + txt.slice(pos));
    setTimeout(() => { el.focus(); el.selectionStart = el.selectionEnd = pos + valeur.length; });
  }

  async envoyer(): Promise<void> {
    if (!this.message.value || !this.aUneDestination()) return;
    this.envoiEnCours.set(true);

    if (this.envoiPere() && this.data.telPere) {
      await this.whatsapp.envoyer(this.data.telPere, this.message.value);
      this.statutEnvoi.update(s => ({ ...s, pere: true }));
    }
    if (this.envoiMere() && this.data.telMere) {
      await this.whatsapp.envoyer(this.data.telMere, this.message.value);
      this.statutEnvoi.update(s => ({ ...s, mere: true }));
    }

    this.envoiEnCours.set(false);
  }

  fermer(): void {
    this.dialogRef.close();
  }
}