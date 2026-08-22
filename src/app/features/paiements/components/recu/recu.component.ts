import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { GetServices, PatchServices } from '../../../../core/services/@data';
import { ActivatedRoute } from '@angular/router';
import { PaiementEnrichi, FamilleEnrichi, EleveEnrichi, FamilleService } from '../../../../core/models';

@Component({
  selector: 'app-recu',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './recu.component.html',
  styleUrl: './recu.component.css',
  standalone: true,
})
export class RecuComponent implements OnInit {

  private get = inject(GetServices);
  private route = inject(ActivatedRoute);
  private patch = inject(PatchServices);
  private fas = inject(FamilleService)

  readonly MAX_ENFANTS_AFFICHES = 2;

  id_paiement: string | null = null;
  paiement: PaiementEnrichi | null = null;
  famille: FamilleEnrichi | null = null;

  enfantsAffiches: EleveEnrichi[] = [];
  enfantsRestants: EleveEnrichi[] = [];
  classesRestantesTexte = '';

  montantVerse = 0;
  montantRestant = 0;

  heureImpression = new Date();

  impressionEnCours = signal(false);

  serviceClient = {
    what: '+237 00 00 00 00',
    appel: '+237 00 00 00 00'
  }
  libelleCopie!: string;
  libelleCopieSuivante(paiement: PaiementEnrichi): string {
    const n = paiement.nb_impressions;
    if (n === 0) return 'Original';
    return `Copie n°${n}`;
  }


  ngOnInit(): void {
    this.id_paiement = this.route.snapshot.paramMap.get('id');
    if (!this.id_paiement) return;

    this.paiement = this.get.getPaiements().find(p => p.id_paiement === this.id_paiement) ?? null;
    if (!this.paiement) return;

    this.famille = this.get.getFamilles().find(f => f.id_famille === this.paiement!.id_famille) ?? null;
    if (!this.famille) return;

    const eleves = this.famille.eleves ?? [];
    this.enfantsAffiches = eleves.slice(0, this.MAX_ENFANTS_AFFICHES);
    this.enfantsRestants = eleves.slice(this.MAX_ENFANTS_AFFICHES);
    this.classesRestantesTexte = this.enfantsRestants
      .map(e => e.classe?.nom_classe)
      .filter(Boolean)
      .join(', ');

    const fa = this.fas.initService(this.famille)

    this.libelleCopie = this.libelleCopieSuivante(this.paiement)

    this.montantVerse = fa.montantVerse
    this.montantRestant = fa.montantRestant
  }

  imprimer(): void {
    window.print()
    this.marquerImpression();
  }

  async telechargerPdf(): Promise<void> {
  }

  private async marquerImpression(): Promise<void> {
    debugger
    if (!this.paiement) return;
    this.impressionEnCours.set(true);
    const p = this.paiement;
    const premiereImpression = p.nb_impressions === 0;

    p.nb_impressions = 1 + (+ p.nb_impressions);
    if (premiereImpression) p.statut = 'confirmé';
    await this.patch.updatePaiement(p);
    this.impressionEnCours.set(false);
  }
}