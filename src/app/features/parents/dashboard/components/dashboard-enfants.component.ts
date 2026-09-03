// dashboard-enfants.component.ts
// Bloc "Mes enfants" : liste des élèves avec leurs indicateurs du trimestre en cours.
// Le "rang" n'existant pas dans les modèles, il est remplacé par le nombre d'évaluations
// prises en compte dans la moyenne (donne un repère de fiabilité de la moyenne affichée).
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon.component';
import { EleveEnrichi, Note } from '../../../../core/models';
import { BilanTrimestre } from '../note.service';


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
          <a class="card border-0 shadow-sm rounded-4 p-3 mb-2 text-decoration-none text-reset d-block"
             [routerLink]="['/espace-parent/enfants', e.id_eleve]">

            <div class="d-flex align-items-center gap-3">
              <div class="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                   style="width:42px;height:42px">
                {{ e.nom[0] }}{{ e.prenom[0] }}
              </div>
              <div>
                <div class="fw-semibold">{{ e.prenom }} {{ e.nom }}</div>
                <div class="small text-muted">{{ e.classe?.nom_classe ?? '—' }} · {{ e.classe?.niveau ?? '' }}</div>
              </div>
            </div>

            <div class="row row-cols-3 text-center mt-3 g-0">
              <div class="col">
                <div class="fw-bold" [class]="'text-' + moyenneCouleur(noteAleatoireTrimestreEnCours[e.id_eleve]?.note_obtenue ?? null)">
                  {{ afficherMoyenne(noteAleatoireTrimestreEnCours[e.id_eleve]?.note_obtenue ?? null) }}
                </div>
                <div class="small text-muted">{{noteAleatoireTrimestreEnCours[e.id_eleve]?.matiere ?? 'Note aléatoire' }}</div>
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
          </a>
        }
      }

      <a class="btn btn-outline-primary w-100 mt-1" [routerLink]="['/espace-parent/ajouter-enfant']">
        <app-icon name="user-plus" class="me-1"></app-icon> Ajouter un enfant
      </a>
    </div>
  `,
})
export class DashboardEnfantsComponent {
  @Input() eleves: EleveEnrichi[] = [];
  /** Bilan (moyenne + nb évaluations) du trimestre en cours, par id_eleve. Calculé par le parent via NoteService. */
  @Input() bilans: Record<string, BilanTrimestre> = {};
  /** Note aléatoire du trimestre en cours, par id_eleve. Calculée par le parent via NoteService. */
  //ca change de facon aleatoire toutes les 10 secondes pour chaque enfant
  @Input() noteAleatoireTrimestreEnCours: { [k: string]: Note | null } = {};

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