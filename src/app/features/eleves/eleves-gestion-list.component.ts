// features/eleves/list/eleves-gestion-list.component.ts
import { Component, inject, computed, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { EleveEnrichi } from '../../core/models';
import { GetServices } from '../../core/services/@data';
import { TableComponent, CellDefDirective, TableColumn } from '../../shared/components/table/table.component';
import { WhatsappModalComponent, WhatsappModalData } from '../../shared/components/whatsapp-modal/whatsapp-modal.component';
import { EleveModalComponent, EleveModalData } from './modal/eleve-modal.component';


@Component({
  selector: 'app-eleves-gestion-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TableComponent, CellDefDirective, RouterLink],
  template: `
<div class="d-flex flex-column gap-3" style="font-size:13px">

  <!-- ══ BARRE DE FILTRES ══ -->
  <div class="d-flex align-items-center flex-wrap gap-2 pb-3 border-bottom">
    <div class="d-flex flex-column">
      <span class="fw-medium">{{ filtered().length }} élève(s)</span>
      <span class="small text-primary">{{ totalAbsences() }} absence(s) au total</span>
    </div>

    <div class="vr mx-1"></div>

    @for (opt of optsClasse(); track opt.val) {
      <button type="button" class="btn btn-sm rounded-pill"
              [class.btn-primary]="filtreClasse() === opt.val"
              [class.btn-outline-secondary]="filtreClasse() !== opt.val"
              (click)="filtreClasse.set(opt.val)">
        {{ opt.label }}
      </button>
    }

    <div class="vr mx-1"></div>

    @for (opt of optsStatut; track opt.val) {
      <button type="button" class="btn btn-sm rounded-pill"
              [class.btn-primary]="filtreStatut() === opt.val"
              [class.btn-outline-secondary]="filtreStatut() !== opt.val"
              (click)="filtreStatut.set(opt.val)">
        {{ opt.label }}
      </button>
    }
  </div>

  <app-table
    [columns]="columns"
    [data]="filtered()"
    [isGlobalFilter]="true"
    searchPlaceholder="Rechercher un élève..."
    [pageSize]="10"
    [trackByFn]="trackByEleve"
    [isExport]="true"
    exportFilename="eleves"
    emptyMessage="Aucun élève ne correspond à ces critères">

    <ng-template cellDef="nom" let-e>
      <div class="d-flex align-items-center gap-2">
        <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
             [style.background]="avBg(e)" [style.color]="avTxt(e)"
             style="width:28px;height:28px;font-size:10px;font-weight:600">
          {{ initiales(e) }}
        </div>
        <span class="fw-medium">{{ e.nom }} {{ e.prenom }}</span>
      </div>
    </ng-template>

    <ng-template cellDef="tel" let-e>
      <div style="font-size:11px;color:#666">
        <div>{{ e.famille?.tel_pere || '—' }}</div>
        @if (e.famille?.tel_mere) { <div class="text-muted">{{ e.famille?.tel_mere }}</div> }
      </div>
    </ng-template>

        <ng-template cellDef="verifie" let-e>
      @if (e.verifie) {
        <span class="text-success" title="Vérifié">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/>
            <path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      } @else {
        <span class="text-muted" title="Non vérifié">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2 2"/>
          </svg>
        </span>
      }
    </ng-template>
    <ng-template cellDef="statut" let-e>
      <span class="badge rounded-pill"
            [class.bg-success-subtle]="e.statut === 'ACTIF'"
            [class.text-success-emphasis]="e.statut === 'ACTIF'"
            [class.bg-warning-subtle]="e.statut === 'NON-ACTIF'"
            [class.text-warning-emphasis]="e.statut === 'NON-ACTIF'"
            [class.bg-secondary-subtle]="e.statut === 'ARCHIVE'"
            [class.text-secondary-emphasis]="e.statut === 'ARCHIVE'">
        {{ e.statut === 'ACTIF' ? 'Actif' : e.statut === 'NON-ACTIF' ? 'Non actif' : 'Archivé' }}
      </span>
    </ng-template>

    <ng-template cellDef="absences" let-e>
      <span class="badge rounded-pill"
            [class.bg-danger-subtle]="nbAbsences(e) > 0"
            [class.text-danger-emphasis]="nbAbsences(e) > 0"
            [class.bg-success-subtle]="nbAbsences(e) === 0"
            [class.text-success-emphasis]="nbAbsences(e) === 0">
        {{ nbAbsences(e) }}
      </span>
    </ng-template>

    <ng-template cellDef="actions" let-e>
      <div class="d-flex gap-1 justify-content-center">
        <button [routerLink]="['/familles', e.id_famille]" class="btn btn-sm btn-outline-secondary icon-btn" title="Voir la famille">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <circle cx="5" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3"/>
            <circle cx="11" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3"/>
            <path d="M1 13c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            <path d="M10 9.5c2.2 0 4 1.5 4 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="btn btn-sm btn-outline-secondary icon-btn" title="Modifier" (click)="ouvrirModifier(e)">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="btn btn-sm btn-outline-success icon-btn" title="Envoyer un message WhatsApp" (click)="ouvrirWhatsapp(e)">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M8 1a7 7 0 0 0-6 10.6L1 15l3.5-1A7 7 0 1 0 8 1z" stroke="currentColor" stroke-width="1.2"/>
          </svg>
        </button>
      </div>
    </ng-template>

  </app-table>

</div>
  `,
  styles: [`.icon-btn { width:28px; height:28px; padding:0; display:inline-flex; align-items:center; justify-content:center; }`],
})
export class ElevesGestionListComponent {

  private get = inject(GetServices);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef); // ajoute cet import si absent

  columns: TableColumn<EleveEnrichi>[] = [
    { id: 'nom', header: 'Élève', sortable: true, accessor: e => `${e.nom} ${e.prenom}` },
    { id: 'tel', header: 'Téléphone parent', align: 'center', exportable: false, accessor: e => e.famille?.tel_pere ?? '' },
    { id: 'verifie', header: 'Dossier verifie', align: 'center', sortable: true, accessor: e => e.verifie },
    { id: 'statut', header: 'Statut', align: 'center', sortable: true, accessor: e => e.statut },
    { id: 'absences', header: 'Absences', align: 'center', sortable: true, accessor: e => this.nbAbsences(e) },
    { id: 'actions', header: 'Actions', align: 'center', exportable: false },
  ];

  private readonly palette = [
    { bg: '#E8F5E9', txt: '#2E7D32' }, { bg: '#E3F2FD', txt: '#1565C0' },
    { bg: '#FFF8E1', txt: '#F57F17' }, { bg: '#FCE4EC', txt: '#C62828' },
    { bg: '#F3E5F5', txt: '#6A1B9A' }, { bg: '#E0F2F1', txt: '#00695C' },
  ];

  optsStatut = [
    { val: 'Tous', label: 'Tous' },
    { val: 'ACTIF', label: 'Actif' },
    { val: 'NON-ACTIF', label: 'Non actif' },
    { val: 'ARCHIVE', label: 'Archivé' },
  ];

  filtreClasse = signal('Tous');
  filtreStatut = signal('Tous');

  eleves = computed(() => this.get.getEleves().filter(e => e.statut ==='ACTIF') ?? []);

  optsClasse = computed<{ val: string; label: string }[]>(() => {
    const classes = this.get.getClasses() ?? [];
    const ids = new Set((this.eleves()).map(e => e.id_classe));
    const opts = [...ids].map(id => ({
      val: id,
      label: classes.find(c => c.id_classe === id)?.nom_classe ?? id,
    }));
    return [{ val: 'Tous', label: 'Toutes les classes' }, ...opts];
  });


  filtered = computed(() => {
    const cls = this.filtreClasse();
    const statut = this.filtreStatut();
    return this.eleves().filter(e => {
      if (cls !== 'Tous' && e.id_classe !== cls) return false;
      if (statut !== 'Tous' && e.statut !== statut) return false;
      return true;
    });
  });

  totalAbsences = computed(() => this.filtered().reduce((s, e) => s + this.nbAbsences(e), 0));

  trackByEleve = (e: EleveEnrichi) => e.id_eleve;

  nbAbsences(e: EleveEnrichi): number {
    return (e.absences ?? []).length;
  }

  initiales(e: EleveEnrichi): string {
    return `${e.prenom?.[0] ?? ''}${e.nom?.[0] ?? ''}`.toUpperCase();
  }
  private hashIdx(e: EleveEnrichi): number {
    return [...e.id_eleve].reduce((s, c) => s + c.charCodeAt(0), 0) % this.palette.length;
  }
  avBg(e: EleveEnrichi): string { return this.palette[this.hashIdx(e)].bg; }
  avTxt(e: EleveEnrichi): string { return this.palette[this.hashIdx(e)].txt; }

  ouvrirWhatsapp(e: EleveEnrichi): void {
    const nb = this.nbAbsences(e);
    const messageDefaut = `Bonjour, votre enfant ${e.prenom} ${e.nom} a actuellement ${nb} absence(s). Merci de nous contacter.`;

    this.dialog.open(WhatsappModalComponent, {
      data: {
        telPere: e.famille?.tel_pere,
        telMere: e.famille?.tel_mere,
        messageDefaut,
        variables: [
          { label: 'Nom', valeur: `${e.prenom} ${e.nom}` },
          { label: 'Classe', valeur: e.classe?.nom_classe ?? '' },
          { label: 'Statut', valeur: e.statut ?? '' },
          { label: 'Absences', valeur: `${nb}` },
          { label: 'Matricule', valeur: e.matricule ?? '' },
          ...this.varsNotesParSequence(e),
          { label: 'Toutes les notes', valeur: this.notesResume(e) },
        ],
      } satisfies WhatsappModalData,
      width: '600px', maxWidth: '96vw',
    });
  }

  /** Une variable par séquence, ex: "Notes SEQ1" -> "Maths: 12/20, Français: 15/20" */
  private varsNotesParSequence(e: EleveEnrichi): { label: string; valeur: string }[] {
    return (e.sequences ?? []).map(s => ({
      label: `Notes ${s.sequence}`,
      valeur: (s.notes_eleve ?? [])
        .map(n => `${n.matiere}: ${n.note_obtenue}/${n.note_sur}`)
        .join(', '),
    }));
  }

  /** Résumé complet toutes séquences confondues. */
  private notesResume(e: EleveEnrichi): string {
    return (e.sequences ?? [])
      .map(s => {
        const notes = (s.notes_eleve ?? []).map(n => `${n.matiere}: ${n.note_obtenue}/${n.note_sur}`).join(', ');
        return `${s.sequence} — ${notes}`;
      })
      .join(' | ');
  }
  ouvrirModifier(e: EleveEnrichi): void {
    if (!e.famille) return;
    this.dialog.open(EleveModalComponent, {
      data: { famille: e.famille, eleve: e } satisfies EleveModalData,
      width: '460px', maxWidth: '96vw',
    }).afterClosed().subscribe(r => { if (r?.success) this.cdr.markForCheck(); });
  }
}