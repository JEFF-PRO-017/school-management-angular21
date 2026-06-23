// ─────────────────────────────────────────────────────────────────
// famille-row.component.ts
// Une ligne du tableau — reçoit FamilleEnrichi, émet les actions
// ─────────────────────────────────────────────────────────────────
import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FamilleEnrichi } from '../../../../core/models/family';

export type RowAction = 'detail' | 'paiement' | 'modifier' | 'eleve' | 'supprimer';

@Component({
  selector: '[app-famille-row]', // attribut selector → <tr app-famille-row>
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
<!-- Nom + avatar -->
<td>
  <div class="d-flex align-items-center gap-2">
    <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
         [style.background]="avBg"
         [style.color]="avTxt"
         style="width:28px;height:28px;font-size:10px;font-weight:600">
      {{ initiales }}
    </div>
    <span class="fw-medium">{{ f.nom_famille }}</span>
  </div>
</td>

<!-- Téléphones -->
<td class="text-center" style="font-size:11px;color:#666">
  <div>{{ f.tel_pere || '—' }}</div>
  @if (f.tel_mere) { <div class="text-muted">{{ f.tel_mere }}</div> }
</td>

<!-- Enfants -->
<td class="text-center">
  <span class="badge rounded-pill bg-success-subtle text-success-emphasis">
    {{ nbEnfantsLabel }}
  </span>
  @if (nomClasses.length > 0) {
    <div class="text-muted mt-1" style="font-size:10px">
      {{ nomClasses.join(', ') }}
    </div>
  }
</td>

<!-- Pension attendue -->
<td class="text-center text-secondary" style="font-size:12px">{{ fmt(montantAttendu) }}</td>

<!-- Versé -->
<td class="text-center" style="font-size:12px;font-weight:500"
    [class.text-success]="isSolde">
  {{ fmt(totalVerse) }}
</td>

<!-- Restant — colonne accentuée -->
<td class="text-center" style="background:#EBF3FC">
  @if (isOk) {
    <span class="badge rounded-pill bg-success-subtle text-success-emphasis">Soldé ✓</span>
  } @else if (aDette) {
    <span class="badge rounded-pill bg-warning-subtle text-warning-emphasis">{{ fmt(restant) }}</span>
  } @else {
    <span class="text-muted">—</span>
  }
</td>

<!-- Prochain RDV -->
<td class="text-center">
  @if (prochainRdv) {
    <span class="badge rounded-pill bg-warning-subtle text-warning-emphasis"
          style="cursor:pointer"
          title="Enregistrer un paiement"
          (click)="action.emit('paiement')">
      {{ prochainRdv }}
    </span>
  } @else {
    <span class="text-muted" style="font-size:11px">—</span>
  }
</td>

<!-- GPS -->
<td class="text-center">
  @if (f.latitude && f.longitude) {
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 1a5 5 0 0 1 5 5c0 3.5-5 9-5 9S3 9.5 3 6a5 5 0 0 1 5-5z"
            stroke="#0F6E56" stroke-width="1.3" fill="#9FE1CB"/>
      <circle cx="8" cy="6" r="1.5" stroke="#0F6E56" stroke-width="1.2"/>
    </svg>
  } @else {
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 1a5 5 0 0 1 5 5c0 3.5-5 9-5 9S3 9.5 3 6a5 5 0 0 1 5-5z"
            stroke="#ccc" stroke-width="1.3" fill="#f0f0f0"/>
      <circle cx="8" cy="6" r="1.5" stroke="#ccc" stroke-width="1.2"/>
    </svg>
  }
</td>

<!-- Actions -->
<td class="text-center">
  <div class="d-flex gap-1 justify-content-center">

    <button [routerLink]="['/familles', f.id_famille]"
            class="btn btn-sm btn-outline-secondary icon-btn" title="Voir la famille">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <circle cx="5" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3"/>
        <circle cx="11" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3"/>
        <path d="M1 13c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        <path d="M10 9.5c2.2 0 4 1.5 4 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      </svg>
    </button>

    <button class="btn btn-sm icon-btn"
            [class.btn-outline-warning]="aDette"
            [class.btn-outline-secondary]="!aDette"
            title="Payer pension"
            (click)="action.emit('paiement')">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="4" width="14" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
        <path d="M1 7h14" stroke="currentColor" stroke-width="1.3"/>
        <circle cx="5" cy="10" r="1" fill="currentColor"/>
      </svg>
    </button>

    <button class="btn btn-sm btn-outline-secondary icon-btn"
            title="Modifier" (click)="action.emit('modifier')">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M11 2l3 3-8 8H3v-3l8-8z"
              stroke="currentColor" stroke-width="1.3"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <button class="btn btn-sm btn-outline-secondary icon-btn"
            title="Ajouter un élève" (click)="action.emit('eleve')">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="6" r="3" stroke="currentColor" stroke-width="1.3"/>
        <path d="M1 13c0-2.5 2.5-4 6-4M13 10v4M11 12h4"
              stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      </svg>
    </button>

    <button class="btn btn-sm btn-outline-danger icon-btn"
            title="Supprimer" (click)="action.emit('supprimer')">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M3 5h10M6 5V3h4v2M6 8v4M10 8v4"
              stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      </svg>
    </button>

  </div>
</td>
  `,
  styles: [`
    :host { display: table-row; }
    :host:hover td { background: rgba(0,0,0,.015) !important; }
    .icon-btn { width:28px; height:28px; padding:0;
                display:inline-flex; align-items:center; justify-content:center; }
  `],
})
export class FamilleRowComponent {

  @Input({ required: true }) f!: FamilleEnrichi;
  @Input() classesMap: Map<string, { nom_classe: string }> = new Map();
  @Input() palette: { bg: string; txt: string }[] = [];

  @Output() action = new EventEmitter<RowAction>();

  // ── Avatar ──
  get initiales(): string {
    return this.f.nom_famille.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
  }
  private get hashIdx(): number {
    return [...this.f.id_famille].reduce((s, c) => s + c.charCodeAt(0), 0) % (this.palette.length || 1);
  }
  get avBg(): string { return this.palette[this.hashIdx]?.bg ?? '#e0e0e0'; }
  get avTxt(): string { return this.palette[this.hashIdx]?.txt ?? '#333'; }

  // ── Données calculées ──
  get nomClasses(): string[] {
    return [...new Set((this.f.eleves ?? []).map(e =>
      this.classesMap.get(e.id_classe)?.nom_classe ?? e.id_classe
    ))];
  }

  get nbEnfantsLabel(): string {
    const n = (this.f.eleves ?? []).length;
    return `${n} élève${n > 1 ? 's' : ''}`;
  }

  get montantAttendu(): number {
    return 0
    // return (this.f.montant_total_attendu ?? 0) - (this.f.montant_reduction ?? 0);
    
  }

  get totalVerse(): number {
    return (this.f.paiements ?? []).reduce((s, p) => s + (+p.montant_verse), 0);
  }

  get restant(): number { return Math.max(0, this.montantAttendu - this.totalVerse); }
  get aDette(): boolean { return this.restant > 0 && this.montantAttendu > 0; }
  get isOk(): boolean   { return this.restant === 0 && this.montantAttendu > 0; }
  get isSolde(): boolean { return this.totalVerse >= this.montantAttendu && this.montantAttendu > 0; }

  get prochainRdv(): string | null {
    return null
    // const rdv = [...(this.f.paiements ?? [])]
    //   .sort((a, b) => b.date_paiement.localeCompare(a.date_paiement))
    //   .find(p => p.date_prochain_rdv)?.date_prochain_rdv;
    // if (!rdv) return null;
    // return new Date(rdv).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  fmt(n: number): string { return new Intl.NumberFormat('fr-FR').format(Math.round(n)); }
}