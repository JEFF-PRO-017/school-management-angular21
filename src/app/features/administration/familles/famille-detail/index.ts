// famille-detail.component.ts — orchestrateur
import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CacheService } from '../../../../core/services/cache.service';
import { ANNEE_SCOLAIRE } from '../../../../core/models/shared';

import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EleveModalComponent, EleveModalData } from '../../eleves/modal/eleve-modal.component';
import { PaiementModalComponent, PaiementModalData } from '../../paiements/modal/paiement-modal.component';
import { FamilleModalComponent, FamilleModalData } from '../famille-form';

import { EleveEnrichi, FamilleEnrichi, FamilleService } from '../../../../core/models/family';
import { Eleve } from '../../../../core/models/academic';
import { DetailBarComponent } from './components/detail-bar.component';
import { DetailStatsComponent } from './components/detail-stats.component';
import { DetailContactsComponent } from './components/detail-contacts.component';
import { DetailEnfantsComponent } from './components/detail-enfants.component';
import { DetailPaiementsComponent } from './components/detail-paiements.component';
import { DataServiceBase, GetServices, PatchServices } from '../../../../core/services/@data';
import { DeleteServices } from '../../../../core/services/@data/_delete.services';



@Component({
  selector: 'app-famille-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DetailBarComponent,
    DetailStatsComponent,
    DetailContactsComponent,
    DetailEnfantsComponent,
    DetailPaiementsComponent,
  ],
  template: `
@if (famille()) {
  <div class="d-flex flex-column gap-3">

    <!-- Barre -->
    <app-detail-bar
      [famille]="famille()!"
      [resumeEnfants]="resumeEnfants()"
      (paiement)="ouvrirPaiement()"
      (modifier)="ouvrirModification()"
      (ajouterEleve)="ouvrirAjoutEleve()">
    </app-detail-bar>

    <!-- Stats + Contacts côte à côte (jusqu'à 600px : empilés) -->
    <div class="row g-3">
      <div class="col-12 col-md-7">
        <app-detail-stats
          [f]="famille()!"
          [annee]="annee">
        </app-detail-stats>
      </div>
      <div class="col-12 col-md-5">
        <app-detail-contacts
          [famille]="famille()!"
          (copier)="copier($event)">
        </app-detail-contacts>
      </div>
    </div>

    <!-- Enfants -->
    <app-detail-enfants
      [enfants]="enfants()"
      (ajouter)="ouvrirAjoutEleve()"
      (modifier)="ouvrirModifEleve($event)"
      (archiver)="archiverEleve($event)"
      (supprimer)="confirmerSuppression($event)"
      >
    </app-detail-enfants>

    <!-- Paiements -->
    <app-detail-paiements
      [paiements]="paiements()"
      [total]="verse()">
    </app-detail-paiements>

    <!-- Pied -->
    <div class="d-flex justify-content-between text-muted pb-2" style="font-size:11px">
      <span>Famille · {{ famille()!.nom_famille }}</span>
      <span>{{ famille()!.id_famille }}</span>
    </div>

  </div>
} @else {
  <div class="text-center text-muted py-5">Famille introuvable</div>
}
  `
})
export class FamilleDetailComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private get = inject(GetServices);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private fas = inject(FamilleService);
  private patch = inject(PatchServices)
  private delete = inject(DeleteServices)

  // famille = signal<FamilleEnrichi | null>(null);
  id = signal<string>('')
  famille = computed(() => {
    return this.get.getFamilles().find(f => f.id_famille === this.id());
  })
  annee = ANNEE_SCOLAIRE;

  // ── Computed via FamilleService ──────────────────────────────


  attendu = computed(() => this.fas.montantAttentu(this.famille()));
  verse = computed(() => this.fas.montantVerse(this.famille()));
  enfants = computed<EleveEnrichi[]>(() => {
    return this.famille()?.eleves?.filter((e: { statut: string; }) => e.statut != 'NON-ACTIF') ?? []
  });
  paiements = computed(() => (this.famille()?.paiements ?? []));


  resumeEnfants = computed(() => {
    const nb = this.enfants().length;
    const cls = this.enfants()
      .map(e => this.get.getClasses().find(c => c.id_classe === e.id_classe)?.nom_classe)
    return `${nb} enfant${nb > 1 ? 's' : ''}${cls ? ' · ' + cls : ''}`;
  });

  // ── Init ────────────────────────────────────────────────────


  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/espace-administration/familles']); return; }
    this.id.set(id)
  }

  getFamille(id: string) {
    this.id.set(this.id())
  }

  // ── Actions ─────────────────────────────────────────────────

  ouvrirPaiement(): void {
    const f = this.famille();
    if (!f) return;
    this.dialog.open(PaiementModalComponent, {
      data: { famille: f as any, totalVerse: this.verse(), montantAttendu: this.attendu() } satisfies PaiementModalData,
      width: '460px', maxWidth: '96vw',
    }).afterClosed().subscribe(r => { if (r?.success) this.cdr.markForCheck(); });
  }

  ouvrirModification(): void {
    const f = this.famille();
    if (!f) return;
    this.dialog.open(FamilleModalComponent, {
      data: { famille: f } satisfies FamilleModalData,
      width: '520px', maxWidth: '96vw',
    }).afterClosed().subscribe(r => {
      if (r?.success) { this.getFamille(f.id_famille) }
    });
  }

  ouvrirAjoutEleve(): void {
    const f = this.famille();
    if (!f) return;
    this.dialog.open(EleveModalComponent, {
      data: { famille: f as any } satisfies EleveModalData,
      width: '460px', maxWidth: '96vw',
    }).afterClosed().subscribe(r => { this.getFamille(f.id_famille) });
  }

  ouvrirModifEleve(e: Eleve): void {
    const f = this.famille();
    if (!f) return;
    this.dialog.open(EleveModalComponent, {
      data: { famille: f as any, eleve: e as any } satisfies EleveModalData,
      width: '460px', maxWidth: '96vw',
    }).afterClosed().subscribe(r => { this.getFamille(f.id_famille) });
  }

  archiverEleve(e: EleveEnrichi): void {
    const label = e.statut === 'ACTIF' ? 'archiver' : 'réactiver';
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: `${label} l'élève`, message: `${label} ${e.nom} ${e.prenom} ?`, confirm: label }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      // Toggle statut using the same casing as Eleve.statut values
      const statut = e.statut === 'ACTIF' ? 'ARCHIVE' : 'ACTIF';
      this.patch.updateEleve({ ...e, statut })
      const anneeUpdate = this.fas.upateAnneeSvc(this.famille(), e, e.classe)
      if (!anneeUpdate) return
      this.patch.updateAnneeSvc(anneeUpdate)
      this.getFamille(e.id_famille)
    });
  }

  copier(texte: string): void {
    navigator.clipboard.writeText(texte).then(() =>
      this.snack.open('Copié !', '', { duration: 1500 })
    );
  }

    confirmerSuppression(e: EleveEnrichi): void {
      this.dialog.open(ConfirmDialogComponent, {
        data: { title: 'Supprimer la famille', message: `Supprimer "${e.nom}" ?`, confirm: 'Supprimer' }
      }).afterClosed().subscribe(ok => {
        if (!ok) return;
        this.delete.deleteEleve(e.id_eleve)
        this.snack.open('Famille supprimée', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      });
    }
}