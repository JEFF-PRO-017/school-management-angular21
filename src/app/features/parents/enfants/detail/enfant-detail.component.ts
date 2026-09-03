// enfant-detail.component.ts
// Page "Détail d'un enfant" — espace parent.
// Route : /espace-parent/enfants/:id
// Lecture : ParentService.elevesEnrichis() (centralisé).
// Calculs (moyennes) et navigation prev/next : EleveService (métier pur).

import { Component, ChangeDetectionStrategy, computed, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { EleveEnrichi, Absence } from '../../../../core/models';
import { ParentService } from '../../../../core/services';
import { TableComponent, TableColumn } from '../../../../shared/components/table/table.component';
import { BreadcrumbComponent } from '../../components/breadcrumb.component';
import { ParentHeaderComponent } from '../../components/parent-header.component';
import { EleveService } from '../eleve.service';



interface LigneMatiere {
  matiere: string;
  notesParSequence: Record<string, string>;
  moyenneMatiere: number;
}

type Onglet = 'evaluations' | 'absences';

@Component({
  selector: 'app-enfant-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ParentHeaderComponent, BreadcrumbComponent, TableComponent],
  template: `
    <app-parent-header titre="Fiche élève"></app-parent-header>
    <app-breadcrumb [items]="fil()"></app-breadcrumb>

    @if (enfant) {
      <div class="container-fluid p-3">

        <div class="d-flex align-items-center gap-3 mb-3">
          <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0"
               style="width:56px;height:56px;font-weight:600;font-size:1.1rem">
            {{ initiales(enfant) }}
          </div>
          <div>
            <div class="fw-semibold fs-5">{{ enfant.prenom }} {{ enfant.nom }}</div>
            <div class="small text-muted">
              {{ enfant.classe?.nom_classe ?? 'Classe non renseignée' }}
              @if (enfant.matricule) { · Matricule {{ enfant.matricule }} }
            </div>
          </div>
        </div>

        <ul class="nav nav-tabs mb-3">
          <li class="nav-item">
            <button class="nav-link" [class.active]="ongletActif() === 'evaluations'" (click)="ongletActif.set('evaluations')">
              Évaluations
            </button>
          </li>
          <li class="nav-item">
            <button class="nav-link" [class.active]="ongletActif() === 'absences'" (click)="ongletActif.set('absences')">
              Absences
            </button>
          </li>
        </ul>

        @if (ongletActif() === 'evaluations') {
          <div class="d-flex justify-content-end mb-2">
            <span class="badge bg-primary fs-6">Moyenne générale : {{ moyenneGenerale() }}/20</span>
          </div>

          <app-table
            [columns]="colonnesEvaluations()"
            [data]="lignesMatieres()"
            [pageSize]="20"
            emptyMessage="Aucune note enregistrée"
            [rowIdFn]="rowIdMatiere"
            [trackByFn]="rowIdMatiere">
          </app-table>
        } @else {
          <app-table
            [columns]="colonnesAbsences"
            [data]="enfant.absences ?? []"
            [pageSize]="20"
            emptyMessage="Aucune absence enregistrée"
            [rowIdFn]="rowIdAbsence"
            [trackByFn]="rowIdAbsence">

            <ng-template cellDef="justifie" let-a>
              @if (a.justifie ?? false) {
                <span class="badge bg-success">Justifiée</span>
              } @else {
                <span class="badge bg-danger">Non justifiée</span>
              }
            </ng-template>
          </app-table>
        }

        <div class="text-center text-muted small mt-3 d-md-none">
          Glissez à gauche ou à droite pour changer d'enfant
        </div>
      </div>
    } @else {
      <div class="text-center text-muted py-5">Élève introuvable</div>
    }
  `,
})
export class EnfantDetailComponent {
  enfant?: EleveEnrichi;
  ongletActif = signal<Onglet>('evaluations');

  colonnesAbsences: TableColumn<Absence>[] = [
    { id: 'date', header: 'Date', accessor: a => a.date ?? '—', sortable: true, align: 'center' },
    { id: 'heure', header: 'Heure', accessor: a => a.heure ?? '—', align: 'center' },
    { id: 'justifie', header: 'Statut', accessor: a => (a.justifie ?? false) ? 'Justifiée' : 'Non justifiée', align: 'center' },
    { id: 'motif', header: 'Motif', accessor: a => a.motif ?? '—' },
  ];

  rowIdMatiere = (l: LigneMatiere) => l.matiere;
  rowIdAbsence = (a: Absence) => a.id;

  private touchStartX = 0;
  private touchEndX = 0;
  private readonly seuilSwipe = 50;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private parentService: ParentService,
    private eleveService: EleveService,
  ) {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.enfant = this.eleveService.getById(this.parentService.elevesEnrichis(), id);
        this.ongletActif.set('evaluations');
      }
    });
  }

  initiales(e: EleveEnrichi): string {
    return `${e.prenom?.charAt(0) ?? ''}${e.nom?.charAt(0) ?? ''}`.toUpperCase();
  }

  fil() {
    return [
      { label: 'Mes enfants', route: '/espace-parent/enfants' },
      { label: this.enfant ? `${this.enfant.prenom ?? ''} ${this.enfant.nom ?? ''}`.trim() : 'Détail' },
    ];
  }

  moyenneGenerale = computed(() => this.eleveService.calculerMoyenneGenerale(this.enfant as EleveEnrichi));

  lignesMatieres = computed<LigneMatiere[]>(() => {
    if (!this.enfant?.sequences) return [];

    const toutesNotes = this.enfant.sequences.flatMap(s =>
      (s.notes_eleve ?? []).map(n => ({ ...n, sequence: s.sequence ?? '—', matiere: n.matiere ?? 'Non renseigné' }))
    );
    const matieres = [...new Set(toutesNotes.map(n => n.matiere))];

    return matieres.map(matiere => {
      const notesMatiere = toutesNotes.filter(n => n.matiere === matiere);
      const notesParSequence: Record<string, string> = {};
      for (const n of notesMatiere) {
        const obtenue = n.note_obtenue ?? '—';
        const sur = n.note_sur ?? '—';
        notesParSequence[n.sequence] = `${obtenue}/${sur}`;
      }
      return {
        matiere,
        notesParSequence,
        moyenneMatiere: this.eleveService.calculerMoyenneMatiere(this.enfant!, matiere),
      };
    });
  });

  private sequencesPresentes = computed<string[]>(() => {
    if (!this.enfant?.sequences) return [];
    return [...new Set(this.enfant.sequences.map(s => s.sequence ?? '—'))].sort();
  });

  colonnesEvaluations = computed<TableColumn<LigneMatiere>[]>(() => {
    const colonnesSequences: TableColumn<LigneMatiere>[] = this.sequencesPresentes().map(seq => ({
      id: seq,
      header: seq,
      accessor: (l: LigneMatiere) => l.notesParSequence[seq] ?? '—',
      align: 'center' as const,
    }));

    return [
      { id: 'matiere', header: 'Matière', sortable: true },
      ...colonnesSequences,
      {
        id: 'moyenneMatiere',
        header: 'Moyenne',
        accessor: (l: LigneMatiere) => `${l.moyenneMatiere}/20`,
        align: 'center',
        headerBg: '#e7f1ff',
      },
    ];
  });

  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent): void {
    this.touchStartX = e.changedTouches[0].screenX;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(e: TouchEvent): void {
    this.touchEndX = e.changedTouches[0].screenX;
    this.traiterSwipe();
  }

  private traiterSwipe(): void {
    if (!this.enfant) return;
    const liste = this.parentService.elevesEnrichis();
    const delta = this.touchEndX - this.touchStartX;
    if (Math.abs(delta) < this.seuilSwipe) return;

    if (delta < 0) {
      const suivant = this.eleveService.getSuivant(liste, this.enfant.id_eleve);
      if (suivant) this.router.navigate(['/espace-parent/enfants', suivant.id_eleve]);
    } else {
      const precedent = this.eleveService.getPrecedent(liste, this.enfant.id_eleve);
      if (precedent) this.router.navigate(['/espace-parent/enfants', precedent.id_eleve]);
    }
  }
}