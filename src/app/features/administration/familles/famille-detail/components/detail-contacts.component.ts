// detail-contacts.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FamilleEnrichi } from '../../../../../core/models/family';

@Component({
  selector: 'app-detail-contacts',
  standalone: true,
  template: `
<div class="card border-0 shadow-sm h-100">
  <div class="card-header bg-light py-2">
    <span class="small fw-semibold text-secondary">Contacts</span>
  </div>
  <div class="card-body py-2">

    @for (row of rows(); track row.label) {
      <div class="d-flex justify-content-between align-items-center
                  py-2 border-bottom border-opacity-25 small">
        <span class="text-muted">{{ row.label }}</span>
        <div class="d-flex align-items-center gap-2">
          <span>{{ row.valeur || '—' }}</span>
          @if (row.valeur && row.copiable) {
            <button class="btn btn-sm btn-outline-secondary p-0"
                    style="width:22px;height:22px"
                    title="Copier"
                    (click)="copier.emit(row.valeur!)">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <rect x="5" y="5" width="8" height="8" rx="1.5"
                      stroke="currentColor" stroke-width="1.3"/>
                <path d="M3 11V3h8" stroke="currentColor"
                      stroke-width="1.3" stroke-linecap="round"/>
              </svg>
            </button>
          }
        </div>
      </div>
    }

  </div>
</div>
  `
})
export class DetailContactsComponent {
  @Input({ required: true }) famille!: FamilleEnrichi;
  @Output() copier = new EventEmitter<string>();

  rows() {
    const f = this.famille;
    return [
      { label: 'Père',    valeur: f.tel_pere,      copiable: true  },
      { label: 'Mère',    valeur: f.tel_mere,      copiable: true  },
      { label: 'Autre',   valeur: f.tel_autre,     copiable: true  },
      { label: 'Adresse', valeur: f.adresse_texte, copiable: false },
    ].filter(r => r.valeur);
  }
}