// bulletins-view.component.ts — consultation et export PDF des bulletins
import { Component, inject, signal, computed } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CacheService } from '../../../core/services/cache.service';
import { DataService } from '../../../core/services/data.service';
import { PdfService } from '../../../core/services/pdf.service';
import { WhatsappService } from '../../../core/services/whatsapp.service';
import { BulletinSnap, Sequence } from '../../../core/models';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-bulletins-view',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule, MatIconModule, MatFormFieldModule,
    MatSelectModule, MatTableModule, MatTooltipModule,
    EmptyStateComponent, LoadingSpinnerComponent,
  ],
  template: `
    <div class="container-fluid px-0">

      <div class="d-flex align-items-center justify-content-between mb-3">
        <h5 class="fw-bold text-primary mb-0">Bulletins</h5>
        <!-- Regénérer le snapshot -->
        <button mat-stroked-button color="warn" (click)="regenerer()" [disabled]="refreshing()">
          <mat-icon>refresh</mat-icon>
          {{ refreshing() ? 'Calcul…' : 'Régénérer snapshot' }}
        </button>
      </div>

      <!-- Filtres -->
      <div class="row g-2 mb-3">
        <div class="col-12 col-md-4">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Classe</mat-label>
            <mat-select [formControl]="ctrlClasse">
              <mat-option value="">Toutes</mat-option>
              @for (c of classes(); track c.id_classe) {
                <mat-option [value]="c.id_classe">{{ c.nom_classe }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
        <div class="col-12 col-md-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Séquence</mat-label>
            <mat-select [formControl]="ctrlSeq">
              @for (s of sequences; track s) {
                <mat-option [value]="s">{{ s }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (bulletinsFiltres().length === 0) {
        <app-empty-state icon="grade" title="Aucun bulletin"
          subtitle="Sélectionnez une classe et une séquence, puis régénérez le snapshot">
        </app-empty-state>
      } @else {

        <!-- Actions masse -->
        <div class="d-flex gap-2 mb-3">
          <button mat-stroked-button (click)="exporterTousPdf()">
            <mat-icon>picture_as_pdf</mat-icon> PDF toute la classe
          </button>
          <button mat-stroked-button color="accent" (click)="envoyerTousWhatsapp()">
            <mat-icon>send</mat-icon> Envoyer via WhatsApp
          </button>
        </div>

        <!-- Tableau des résultats -->
        <div class="table-responsive rounded shadow-sm">
          <table mat-table [dataSource]="bulletinsFiltres()" class="w-100 mat-elevation-z0">

            <ng-container matColumnDef="rang">
              <th mat-header-cell *matHeaderCellDef>Rang</th>
              <td mat-cell *matCellDef="let b" class="fw-bold text-center">
                {{ b.rang }}
              </td>
            </ng-container>

            <ng-container matColumnDef="eleve">
              <th mat-header-cell *matHeaderCellDef>Élève</th>
              <td mat-cell *matCellDef="let b">{{ nomEleve(b.id_eleve) }}</td>
            </ng-container>

            <ng-container matColumnDef="moy">
              <th mat-header-cell *matHeaderCellDef>Moyenne</th>
              <td mat-cell *matCellDef="let b"
                  [class.text-success]="b.moy_ponderee >= 10"
                  [class.text-danger]="b.moy_ponderee < 10"
                  class="fw-bold">
                {{ b.moy_ponderee.toFixed(2) }} / 20
              </td>
            </ng-container>

            <ng-container matColumnDef="mention">
              <th mat-header-cell *matHeaderCellDef class="d-none d-md-table-cell">
                Mention
              </th>
              <td mat-cell *matCellDef="let b" class="d-none d-md-table-cell">
                <span class="badge bg-primary-subtle text-primary">
                  {{ b.mention }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let b">
                <div class="d-flex gap-1 justify-content-end">
                  <button mat-icon-button (click)="exporterPdfEleve(b)"
                          matTooltip="PDF">
                    <mat-icon>picture_as_pdf</mat-icon>
                  </button>
                  <button mat-icon-button color="accent"
                          (click)="envoyerWhatsappEleve(b)"
                          matTooltip="Envoyer via WhatsApp">
                    <mat-icon>send</mat-icon>
                  </button>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols"></tr>
          </table>
        </div>

        <!-- Statistiques de classe -->
        @if (bulletinsFiltres().length > 0) {
          <div class="card border-0 shadow-sm mt-3">
            <div class="card-body d-flex flex-wrap gap-4">
              <div>
                <div class="text-muted small">Moy. classe</div>
                <div class="fw-bold">{{ bulletinsFiltres()[0]?.moy_classe?.toFixed(2) }}</div>
              </div>
              <div>
                <div class="text-muted small">1er</div>
                <div class="fw-bold text-success">{{ bulletinsFiltres()[0]?.premier?.toFixed(2) }}</div>
              </div>
              <div>
                <div class="text-muted small">Dernier</div>
                <div class="fw-bold text-danger">{{ bulletinsFiltres()[0]?.dernier?.toFixed(2) }}</div>
              </div>
              <div>
                <div class="text-muted small">Effectif</div>
                <div class="fw-bold">{{ bulletinsFiltres().length }}</div>
              </div>
            </div>
          </div>
        }

      }

    </div>
  `
})
export class BulletinsViewComponent {

  private cache    = inject(CacheService);
  private data     = inject(DataService);
  private pdf      = inject(PdfService);
  private whatsapp = inject(WhatsappService);
  private snack    = inject(MatSnackBar);

  sequences: Sequence[] = ['SEQ1','SEQ2','SEQ3','SEQ4','SEQ5','SEQ6'];
  cols    = ['rang', 'eleve', 'moy', 'mention', 'actions'];
  loading = signal(false);
  refreshing = signal(false);

  ctrlClasse = new FormControl('');
  ctrlSeq    = new FormControl<Sequence>('SEQ1');

  classes = computed(() => this.cache.getClasses() ?? []);

  bulletinsFiltres = computed<BulletinSnap[]>(() => {
    const id  = this.ctrlClasse.value;
    const seq = this.ctrlSeq.value;
    return (this.cache.getBulletins() ?? [])
      .filter(b => (!id || b.id_classe === id) && (!seq || b.sequence === seq))
      .sort((a, b) => a.rang - b.rang);
  });

  nomEleve(id: string): string {
    const e = (this.cache.getEleves() ?? []).find(x => x.id_eleve === id);
    return e ? `${e.nom} ${e.prenom}` : id;
  }

  async regenerer(): Promise<void> {
    this.refreshing.set(true);
    await this.data.refreshBulletinsSnap();
    this.refreshing.set(false);
    this.snack.open('Bulletins mis à jour', 'OK', { duration: 3000 });
  }

  exporterPdfEleve(b: BulletinSnap): void {
    const eleve = this.data.getElevesEnrichis()
      .find((e: any) => e.id_eleve === b.id_eleve);
    if (!eleve) return;
    this.pdf.genererBulletin(eleve as any, b, []);
  }

  exporterTousPdf(): void {
    this.bulletinsFiltres().forEach(b => this.exporterPdfEleve(b));
  }

  async envoyerWhatsappEleve(b: BulletinSnap): Promise<void> {
    const eleve = (this.cache.getEleves() ?? []).find(e => e.id_eleve === b.id_eleve);
    const fam   = eleve ? this.cache.famillesMap().get(eleve.id_famille) : null;
    const tel   = fam?.tel_pere ?? fam?.tel_mere ?? '';
    if (!tel) {
      this.snack.open('Numéro introuvable', '', { duration: 2000 });
      return;
    }
    const nom = eleve ? `${eleve.nom} ${eleve.prenom}` : b.id_eleve;
    await this.whatsapp.envoyerRappelRdv(nom, tel, b.sequence, b.id_eleve);
    this.snack.open('Bulletin envoyé via WhatsApp', 'OK', { duration: 3000 });
  }

  async envoyerTousWhatsapp(): Promise<void> {
    for (const b of this.bulletinsFiltres()) {
      await this.envoyerWhatsappEleve(b);
    }
  }
}
