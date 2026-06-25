// detail-paiements.component.ts
import { Component, Input, signal, computed } from '@angular/core';
import { Paiement } from '../../../../core/models/payment';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-detail-paiements',
  standalone: true,
  imports: [PaginationComponent],
  template: `
<div class="card border-0 shadow-sm">
  <div class="card-header bg-light d-flex align-items-center justify-content-between py-2">
    <span class="small fw-semibold text-secondary">Historique paiements</span>
    <span class="text-muted small">
      {{ paiements.length }} versement(s) ·
      {{ fmt(total) }} FCFA
    </span>
  </div>

  @if (paiements.length === 0) {
    <div class="text-center text-muted py-4 small">Aucun paiement enregistré</div>
  } @else {
    <div class="table-responsive">
      <table class="table table-sm table-hover align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th>Date · Période</th>
            <th class="text-center">Montant</th>
            <th class="text-center">Mode</th>
            <!-- <th class="text-center">Prochain RDV</th> -->
            <th class="text-center">WhatsApp</th>
          </tr>
        </thead>
        <tbody>
          @for (p of page(); track p.id_paiement) {
            <tr>
              <td>
                <div class="fw-semibold small">{{ fmtDate(p.date_paiement) }}</div>
                <div class="text-muted" style="font-size:10px">
                  {{ p.date_paiement || '—' }}
                </div>
              </td>
              <td class="text-center">
                <span class="badge text-bg-success">{{ fmt(p.montant_verse) }}</span>
              </td>
              <td class="text-center">
                <span class="badge text-bg-secondary">
                  {{ p.mode_paiement === 'mobile' ? 'Mobile' : 'Cash' }}
                </span>
              </td>
              <!-- <td class="text-center small text-muted">
                {{ p.date_prochain_rdv ? fmtDate(p.date_prochain_rdv) : '—' }}
              </td> -->
              <td class="text-center">
                <span class="badge"
                      [class.text-bg-success]="p.statut_alerte_whatsapp === 'ENVOYE'"
                      [class.text-bg-danger]="p.statut_alerte_whatsapp === 'ECHEC'"
                      [class.text-bg-secondary]="p.statut_alerte_whatsapp !== 'ENVOYE' && p.statut_alerte_whatsapp !== 'ECHEC'">
                  {{ wLabel(p.statut_alerte_whatsapp) }}
                </span>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <div class="px-3 pb-2">
      <app-pagination
        [total]="paiements.length"
        [pageSize]="8"
        (pageChange)="onPage($event)">
      </app-pagination>
    </div>
  }
</div>
  `
})
export class DetailPaiementsComponent {
  @Input({ required: true }) paiements: Paiement[] = [];
  @Input() total = 0;

  private debut = signal(0);
  private fin   = signal(8);

  page = computed(() => this.paiements.slice(this.debut(), this.fin()));

  onPage(e: { debut: number; fin: number }): void {
    this.debut.set(e.debut);
    this.fin.set(e.fin);
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(+n));
  }

  fmtDate(iso: string): string {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return iso; }
  }

  wLabel(s: string): string {
    if (s === 'ENVOYE') return 'Envoyé';
    if (s === 'ECHEC')  return 'Échec';
    return 'En attente';
  }
}