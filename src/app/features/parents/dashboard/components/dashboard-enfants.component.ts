// dashboard-enfants.component.ts
// Bloc "Mes enfants" : liste des élèves avec leurs indicateurs du trimestre en cours.
// Le "rang" n'existant pas dans les modèles, il est remplacé par le nombre d'évaluations
// prises en compte dans la moyenne (donne un repère de fiabilité de la moyenne affichée).
//
// Règle (même logique que enfants-list.component.ts) : statut 'NON-ACTIF' → bouton
// Supprimer ; tout autre statut → bouton Modifier. Couleur (vert/gris) reprise sur
// l'avatar, la bordure de la carte et le badge de statut.
import { Component, Input, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon.component';
import { EleveEnrichi, Note } from '../../../../core/models';
import { BilanTrimestre } from '../note.service';
import { DeleteServices } from '../../../../core/services/@data/_delete.services';

@Component({
  selector: 'app-dashboard-enfants',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="mx-3 mt-4">
      <div class="text-uppercase text-muted small fw-semibold mb-2">Mes enfants ({{ eleves.length }})</div>

      @if (eleves.length === 0) {
        <div class="text-center text-muted small py-4">Aucun enfant inscrit</div>
      } @else {
        @for (e of eleves; track e.id_eleve) {
          <div class="card border shadow-sm rounded-4 p-3 mb-2"
               [class.border-success]="estActif(e)" [class.border-secondary-subtle]="!estActif(e)">

            <!-- Zone cliquable : ouvre la fiche détail -->
            <a class="d-flex align-items-center gap-3 text-decoration-none text-reset"
               [routerLink]="['/espace-parent/enfants', e.id_eleve]">
              <div class="rounded-circle text-white fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                   [class.bg-success]="estActif(e)" [class.bg-secondary]="!estActif(e)"
                   style="width:42px;height:42px">
                {{ e.nom[0] }}{{ e.prenom[0] }}
              </div>
              <div class="flex-grow-1">
                <div class="fw-semibold">{{ e.prenom }} {{ e.nom }}</div>
                <div class="small text-muted">{{ e.classe?.nom_classe ?? '—' }} · {{ e.classe?.niveau ?? '' }}</div>
                <span class="badge" [class.bg-success]="estActif(e)" [class.bg-secondary]="!estActif(e)">
                  {{ e.statut }}
                </span>
              </div>
            </a>

            <div class="row row-cols-3 text-center mt-3 g-0">
              <div class="col">
                <div class="fw-bold" [class]="'text-' + moyenneCouleur(noteAleatoireTrimestreEnCours[e.id_eleve]?.note_obtenue ?? null)">
                  {{ afficherMoyenne(noteAleatoireTrimestreEnCours[e.id_eleve]?.note_obtenue ?? null) }}
                </div>
                <div class="small text-muted">{{ noteAleatoireTrimestreEnCours[e.id_eleve]?.matiere ?? 'Note aléatoire' }}</div>
              </div>
              <div class="col">
                <div class="fw-bold" [class]="'text-' + absencesCouleur(e.absences?.length ?? 0)">
                  {{ e.absences?.length ?? 0 }}
                </div>
                <div class="small text-muted">Absences</div>
              </div>
              <div class="col">
                <div class="fw-bold text-body">
                  {{ bilans[e.id_eleve]?.nbEvaluations ?? 0 }}
                </div>
                <div class="small text-muted">Évaluations</div>
              </div>
            </div>

<!-- Actions : Modifier toujours visible, Supprimer en plus si NON-ACTIF -->
<div class="d-flex gap-2 mt-3">
  <a class="btn btn-outline-primary flex-fill"
     [routerLink]="['/espace-parent/enfants', e.id_eleve, 'edit']">
    <app-icon name="pencil" class="me-1"></app-icon> Modifier
  </a>
  @if (e.statut === 'NON-ACTIF') {
    <button type="button" class="btn btn-outline-danger flex-fill"
            [disabled]="suppressionEnCours() === e.id_eleve"
            (click)="onSupprimer(e)">
      @if (suppressionEnCours() === e.id_eleve) {
        <span class="spinner-border spinner-border-sm"></span>
      } @else {
        <app-icon name="trash" class="me-1"></app-icon> Supprimer
      }
    </button>
  }
</div>
          </div>
        }
      }

      <a class="btn btn-outline-primary w-100 mt-1" [routerLink]="['/espace-parent/enfants/create']">
        <app-icon name="user-plus" class="me-1"></app-icon> Ajouter un enfant
      </a>
    </div>
  `,
})
export class DashboardEnfantsComponent {
  private deleteSvc = inject(DeleteServices);

  @Input() eleves: EleveEnrichi[] = [];
  /** Bilan (moyenne + nb évaluations) du trimestre en cours, par id_eleve. Calculé par le parent via NoteService. */
  @Input() bilans: Record<string, BilanTrimestre> = {};
  /** Note aléatoire du trimestre en cours, par id_eleve. Calculée par le parent via NoteService. */
  @Input() noteAleatoireTrimestreEnCours: { [k: string]: Note | null } = {};

  /** id_eleve en cours de suppression (pour désactiver uniquement son bouton). */
  suppressionEnCours = signal<string | null>(null);

  /** Tout ce qui n'est pas 'NON-ACTIF' est considéré actif (statuts futurs inclus). */
  estActif(e: EleveEnrichi): boolean {
    return e.statut !== 'NON-ACTIF';
  }

  async onSupprimer(e: EleveEnrichi): Promise<void> {
    if (!confirm(`Supprimer définitivement ${e.prenom} ${e.nom} ?`)) return;

    this.suppressionEnCours.set(e.id_eleve);
    try {
      await this.deleteSvc.deleteEleve(e.id_eleve);
    } finally {
      this.suppressionEnCours.set(null);
    }
  }

  afficherMoyenne(m: any): string {
    m = +m; // conversion du string en nombre (pour gérer les notes sur 20 ou sur 100)
    return m !== null ? m.toFixed(1) : '—';
  }

  moyenneCouleur(m: any): string {
    m = +m; // conversion du string en nombre (pour gérer les notes sur 20 ou sur 100)
    if (m === null) return 'body';
    if (m >= 10) return 'success';
    if (m >= 8) return 'warning';
    return 'danger';
  }

  absencesCouleur(n: number): string {
    if (n === 0) return 'success';
    if (n < 3) return 'warning';
    return 'danger';
  }
}