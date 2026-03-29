// templates-list.component.ts — liste des templates de messages WhatsApp
import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DataService } from '../../../core/services/data.service';
import { MsgTemplate } from '../../../core/models';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-templates-list',
  standalone: true,
  imports: [
    RouterLink, MatButtonModule, MatIconModule,
    MatCardModule, MatChipsModule, MatSlideToggleModule,
    EmptyStateComponent,
  ],
  template: `
    <div class="container-fluid px-0">

      <div class="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h5 class="fw-bold text-primary mb-0">Templates WhatsApp</h5>
          <p class="text-muted small mb-0">Messages pré-enregistrés envoyés aux parents</p>
        </div>
        <div class="d-flex gap-2">
          <a routerLink="/whatsapp/alertes" mat-stroked-button color="accent">
            <mat-icon>history</mat-icon> Journal envois
          </a>
          <a routerLink="/whatsapp/templates/nouveau" mat-raised-button color="primary">
            <mat-icon>add</mat-icon> Nouveau template
          </a>
        </div>
      </div>

      <!-- Variables disponibles — aide contextuelle -->
      <div class="alert alert-info py-2 mb-3 small">
        <mat-icon class="me-1" style="font-size:16px;vertical-align:middle">info</mat-icon>
        Variables disponibles dans le contenu :
        <code>{{ '{' }}nom_eleve{{ '}' }}</code> · <code>{{ '{' }}montant{{ '}' }}</code> · <code>{{ '{' }}date{{ '}' }}</code> ·
        <code>{{ '{' }}classe{{ '}' }}</code> · <code>{{ '{' }}nom_famille{{ '}' }}</code>
      </div>

      @if (templates().length === 0) {
        <app-empty-state icon="message" title="Aucun template"
          subtitle="Créez un template pour commencer à envoyer des alertes">
        </app-empty-state>
      } @else {

        <div class="row g-3">
          @for (t of templates(); track t.id_template) {
            <div class="col-12 col-md-6">
              <mat-card class="h-100">
                <mat-card-header>
                  <mat-card-title class="d-flex align-items-center gap-2">
                    <span>{{ t.objet }}</span>
                    <!-- Badge type -->
                    <span class="badge bg-primary-subtle text-primary small">
                      {{ t.type }}
                    </span>
                    <!-- Badge destinataire -->
                    <span class="badge bg-secondary-subtle text-secondary small">
                      {{ t.destinataire }}
                    </span>
                  </mat-card-title>
                </mat-card-header>

                <mat-card-content class="mt-2">
                  <!-- Aperçu du contenu -->
                  <div class="bg-light rounded p-2 small font-monospace text-muted"
                       style="max-height:80px;overflow:hidden">
                    {{ t.contenu }}
                  </div>
                </mat-card-content>

                <mat-card-actions class="d-flex align-items-center justify-content-between px-3">
                  <!-- Toggle actif/inactif -->
                  <mat-slide-toggle
                    [checked]="t.actif"
                    (change)="toggleActif(t, $event.checked)"
                    color="primary">
                    {{ t.actif ? 'Actif' : 'Inactif' }}
                  </mat-slide-toggle>

                  <!-- Actions -->
                  <div class="d-flex gap-1">
                    <a [routerLink]="['/whatsapp/templates', t.id_template, 'modifier']"
                       mat-icon-button>
                      <mat-icon>edit</mat-icon>
                    </a>
                  </div>
                </mat-card-actions>
              </mat-card>
            </div>
          }
        </div>
      }

    </div>
  `
})
export class TemplatesListComponent implements OnInit {

  private data  = inject(DataService);
  private snack = inject(MatSnackBar);

  templates = signal<MsgTemplate[]>([]);

  async ngOnInit(): Promise<void> {
    const raw = await this.data.readSheetPublic<MsgTemplate>('F7_MSG_TEMPLATES');
    this.templates.set(raw);
  }

  toggleActif(t: MsgTemplate, actif: boolean): void {
    this.templates.update(list =>
      list.map(x => x.id_template === t.id_template ? { ...x, actif } : x)
    );
    // Mise à jour dans Sheets via queue (colonne "actif" = col 8)
    this.snack.open(`Template ${actif ? 'activé' : 'désactivé'}`, '', { duration: 2000 });
  }
}
