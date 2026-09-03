import { inject, Injectable } from "@angular/core";
import { ANNEE_SCOLAIRE, POURCENT_PENSION } from "../shared";
import { AnneeScolaireFamille, EleveEnrichi, FamilleEnrichi } from "./famille.model";
import { Classe, Eleve } from "../academic";
import { EleveData } from "../../../features/administration/insolvables/insolvables-list/insolvables-list.component";
import { CacheService } from "../../services/cache.service";

/** Données financières d'une famille pour l'année scolaire en cours. */
interface FamilleData {
    anneeSvcEncours: AnneeScolaireFamille | undefined;
    montantAttentu: number;
    montantVerse: number;
    montantRestant: number;
    dernierRdvFamille: string | null;
    reductionTotal: number;
}

/** Regroupe les infos nécessaires pour construire la fiche d'un élève. */
interface ContexteEleve {
    nbEnfantsFamille: number;
    fs: FamilleData;
    moratoireDepasse: boolean;
    insolvable: boolean;
    reductionsParEleve: number[];
    versementsParEleve: number[];
    montantDuParEleve: number[];
}

/** Réduction (%) pour les familles de plus de 2 enfants. */
const COEF_REDUCTION_FAMILLE_NOMBREUSE = 5;

/** Seuil au-delà duquel on arrondit au millier plutôt qu'à la demi-centaine. */
const SEUIL_ARRONDI_MILLIER = 5000;

@Injectable({
    providedIn: 'root'
})
export class FamilleService {
    private cache = inject(CacheService)

    // =========================================================================
    // 1. CALCULS DE BASE SUR UNE FAMILLE
    // =========================================================================

    /** Calcule toutes les données financières d'une famille pour l'année en cours. */
    initService(f: FamilleEnrichi): FamilleData {
        const anneeSvcEncours = this.anneeSvcEncours(f);
        const montantAttentu = this.montantAttentu(f);
        const montantVerse = this.montantVerse(f);
        const montantRestant = this.montantRestant(montantAttentu, montantVerse);
        const dernierRdvFamille = this.dernierRdvFamille(f);
        const reductionTotal = this.reductionTotal(f);

        return {
            anneeSvcEncours,
            montantAttentu,
            montantVerse,
            montantRestant,
            dernierRdvFamille,
            reductionTotal
        };
    }

    /** Retourne l'année scolaire en cours pour cette famille, si elle existe. */
    anneeSvcEncours(f: FamilleEnrichi | null): AnneeScolaireFamille | undefined {
        // J'AI GERE AINSI PARCEQUE CERTAINES TABLES NE SONT PAS TOTALEMEMNT ENRICHIES , DOU L'ABSENCE DE CERTAINES VALEUR EXEMPLE DE ELEVE QUI NE CONTINT PAS LES INOS PRECIS DE FAMILLES
        const annees = this.cache.getFamilles().find(fa => fa.id_famille === f?.id_famille).annee_scolaires;
        return annees ? annees.find((a: { annee_scolaire: string; }) => a.annee_scolaire === ANNEE_SCOLAIRE) : undefined;
    }

    /** Montant réellement dû (attendu moins les réductions). */
    montantAttentu(f: FamilleEnrichi | null): number {
        if (!f) return 0;
        const a = this.anneeSvcEncours(f);
        return +(a?.montant_total_attendu ?? 0) - +(a?.montant_reduction ?? 0) - +(a?.montant_reduction_special ?? 0);
    }

    /** Somme de tous les paiements de la famille. */
    montantVerse(f: FamilleEnrichi | null): number {
        if (!f) return 0;
        const paiements = f.paiements ?? [];
        return paiements.reduce((somme, p) => somme + (+p.montant_verse), 0);
    }

    /** Reste à payer (jamais négatif). */
    montantRestant(attentu: number, verse: number): number {
        return Math.max(0, attentu - verse);
    }

    /** Réduction totale (normale + spéciale). */
    reductionTotal(f: FamilleEnrichi | any): number {
        if (!f) return 0;
        const a = this.anneeSvcEncours(f);
        if (!a) return 0;
        return +(a.montant_reduction ?? 0) + +(a.montant_reduction_special ?? 0);
    }

    /** Date d'échéance la plus récente parmi les moratoires non réglés. */
    dernierRdvFamille(f: FamilleEnrichi | any): string | null {
        if (!f) return null;
        const datesMoratoiresEnAttente: string[] = (this.anneeSvcEncours(f)?.moratoires ?? [])
            .filter((m: any) => !m.regler && m.date_fin)
            .map((m: any) => m.date_fin as string);

        return datesMoratoiresEnAttente.length
            ? datesMoratoiresEnAttente.sort().at(-1)!
            : null;
    }

    // =========================================================================
    // 2. MISE À JOUR DE L'ANNÉE SCOLAIRE (AJOUT / SUPPRESSION D'UN ÉLÈVE)
    // =========================================================================

    /** Recalcule montant attendu + réduction après ajout/changement de classe d'un élève. */
    upateAnneeSvc(f: FamilleEnrichi, e: Eleve, c: Classe | any): AnneeScolaireFamille | null {
        const anneeSvc = this.anneeSvcEncours(f);
        if (!anneeSvc) return null;

        // On retire l'élève pour ne pas le compter deux fois, puis on le réintègre après.
        const autresEleves = (f.eleves ?? []).filter(el => el.id_eleve !== e.id_eleve);
        const { attendu, reduction } = this.calculerAttenduAvecNouvelleClasse(autresEleves, c);

        return {
            ...anneeSvc,
            montant_total_attendu: attendu,
            montant_reduction: reduction,
        };
    }

    creerAnneeScolaire(
        idFamille: string,
        annee: string,
        reductionSpecial = 0
    ): AnneeScolaireFamille {
        return {
            id_annee_scolaire: `${idFamille}AN_SC`,
            id_famille: idFamille,
            annee_scolaire: annee,
            montant_total_attendu: 0,
            montant_reduction: 0,
            montant_reduction_special: reductionSpecial,
            anciennete: 0,
            format_montant: 0,
            format_statut: 'cash',
            application_montant: 0
        };
    }


    /** Recalcule montant attendu + réduction après suppression d'un élève. */
    deleteAnneeSvc(f: FamilleEnrichi, e: Eleve): AnneeScolaireFamille | null {
        const anneeSvc = this.anneeSvcEncours(f);
        if (!anneeSvc) return null;

        const elevesRestants = (f.eleves ?? []).filter(el => el.id_eleve !== e.id_eleve);
        const attendu = this.sommePrixEleves(elevesRestants);
        const reduction = this.calculerReductionFamilleNombreuse(attendu, elevesRestants.length);

        return {
            ...anneeSvc,
            montant_total_attendu: attendu,
            montant_reduction: reduction,
        };
    }

    /** Additionne le prix de classe de chaque élève d'une liste. */
    private sommePrixEleves(eleves: EleveEnrichi[]): number {
        return (eleves ?? []).reduce((somme, e) => somme + Number(e.classe?.prix ?? 0), 0);
    }

    /** Montant attendu total (élèves existants + nouvelle classe) et sa réduction. */
    private calculerAttenduAvecNouvelleClasse(autresEleves: EleveEnrichi[], nouvelleClasse: Classe | any): { attendu: number; reduction: number } {
        const attendu = this.sommePrixEleves(autresEleves) + Number(nouvelleClasse?.prix ?? 0);
        const nbTotalEnfants = autresEleves.length + 1;
        const reduction = this.calculerReductionFamilleNombreuse(attendu, nbTotalEnfants);
        return { attendu, reduction };
    }

    /** Réduction famille nombreuse : appliquée à partir de 3 enfants. */
    private calculerReductionFamilleNombreuse(montantAttendu: number, nbEnfants: number): number {
        return nbEnfants > 2 ? (montantAttendu * COEF_REDUCTION_FAMILLE_NOMBREUSE) / 100 : 0;
    }

    // =========================================================================
    // 3. CONSTRUCTION DE LA LISTE DES ÉLÈVES (POUR LA PAGE "INSOLVABLES")
    // =========================================================================

    /** Construit la liste des élèves (toutes familles confondues) avec leurs données financières. */
    construireElevesDataAvecFamille(familles: FamilleEnrichi[]): EleveData[] {
        const aujourdhui = this.dateDuJourISO();
        const result: EleveData[] = [];

        for (const famille of familles) {
            result.push(...this.construireDonneesPourFamille(famille, aujourdhui));
        }
        return result;
    }

    /** Date du jour au format AAAA-MM-JJ. */
    private dateDuJourISO(): string {
        return new Date().toISOString().slice(0, 10);
    }

    /**
     * Construit les fiches de tous les élèves d'une même famille.
     * La réduction est répartie en premier (plafonnée au prix de chaque classe),
     * puis le versement est réparti sur la capacité restante (prix - réduction déjà reçue),
     * pour ne jamais créditer un enfant au-delà de ce qu'il doit réellement.
     */
    private construireDonneesPourFamille(famille: FamilleEnrichi, aujourdhui: string): EleveData[] {
        const elevesActifs = famille.eleves ?? [];
        const nbEnfantsFamille = elevesActifs.length;
        if (nbEnfantsFamille === 0) return [];

        const fs = this.initService(famille);
        const moratoireDepasse = this.estMoratoireDepasse(fs.dernierRdvFamille, aujourdhui);
        const insolvable = this.estInsolvable(fs.montantAttentu, fs.montantVerse);

        // Prix de la classe de chaque enfant : sert de plafond pour la réduction.
        const montantDuParEleve = elevesActifs.map(e => Number(e.classe?.prix ?? 0));

        const reductionsParEleve = this.repartirMontantIntelligent(fs.reductionTotal, montantDuParEleve);

        // Capacité restante après réduction : sert de plafond pour le versement.
        const capaciteRestante = montantDuParEleve.map((prix, i) => prix - reductionsParEleve[i]);
        const versementsParEleve = this.repartirMontantIntelligent(fs.montantVerse, capaciteRestante);

        const contexte: ContexteEleve = {
            nbEnfantsFamille, fs, moratoireDepasse, insolvable,
            reductionsParEleve, versementsParEleve, montantDuParEleve
        };

        return elevesActifs.map((eleve, index) => this.construireEleveData(eleve, index, contexte));
    }

    /** Vrai si la date d'échéance du moratoire est déjà passée. */
    private estMoratoireDepasse(dernierRdv: string | null, aujourdhui: string): boolean {
        return dernierRdv ? dernierRdv < aujourdhui : false;
    }

    /** Vrai si le versement est en dessous du seuil de solvabilité. */
    private estInsolvable(attendu: number, verse: number): boolean {
        return attendu > 0 && (verse * 100) / attendu < POURCENT_PENSION;
    }

    /** Assemble la fiche finale d'un élève à partir du contexte familial. */
    private construireEleveData(eleve: EleveEnrichi, index: number, ctx: ContexteEleve): EleveData {
        const pension = ctx.montantDuParEleve[index] ?? 0;
        const montantParEnfant = ctx.versementsParEleve[index] ?? 0;
        const reductionParEnfant = ctx.reductionsParEleve[index] ?? 0;
        const resteParEnfant = Math.max(0, pension - montantParEnfant - reductionParEnfant);

        return {
            ...eleve,
            nb_enfants_famille: ctx.nbEnfantsFamille,
            montant_par_enfant: montantParEnfant,
            reste_par_enfant: resteParEnfant,
            verse_famille: ctx.fs.montantVerse,
            attendu_famille: ctx.fs.montantAttentu,
            restant_famille: ctx.fs.montantRestant,
            moratoire_depasse: ctx.moratoireDepasse,
            insolvable: ctx.insolvable,
        };
    }

    // =========================================================================
    // 4. RÉPARTITION PROPORTIONNELLE D'UN MONTANT ENTRE PLUSIEURS ENFANTS
    // =========================================================================

    /**
     * Répartit un montant à parts égales entre les enfants, sans jamais
     * dépasser le plafond de chacun (ex : prix de sa classe). Le surplus dû
     * aux arrondis (ou à un enfant dont le plafond est déjà atteint) est
     * redistribué aux enfants qui ont encore de la marge.
     *
     * @param montantTotal      Montant à répartir
     * @param plafondsParEnfant Plafond maximum que chaque enfant peut recevoir
     */
    repartirMontantIntelligent(montantTotal: number, plafondsParEnfant: number[]): number[] {
        const nombreEnfants = plafondsParEnfant.length;
        if (nombreEnfants === 0) return [];

        // Part égale de départ, arrondie et jamais au-delà du plafond de l'enfant.
        const montantBase = Math.floor(montantTotal / nombreEnfants);
        const montantArrondi = this.arrondirMontantParEnfant(montantBase);
        const repartition = plafondsParEnfant.map(plafond => Math.min(montantArrondi, plafond));

        this.distribuerLeReste(montantTotal, repartition, plafondsParEnfant);

        return repartition;
    }

    /** Arrondit vers le bas : au millier si >= 5000, sinon à la demi-centaine. */
    private arrondirMontantParEnfant(montantBase: number): number {
        if (montantBase < 500) return montantBase;

        return montantBase >= SEUIL_ARRONDI_MILLIER
            ? Math.floor(montantBase / 1000) * 1000
            : Math.floor(montantBase / 500) * 500;
    }

    /** Distribue le reliquat aux enfants qui ont encore de la marge (plafond non atteint). */
    private distribuerLeReste(montantTotal: number, repartition: number[], plafonds: number[]): void {
        let reste = montantTotal - repartition.reduce((somme, m) => somme + m, 0);

        while (reste > 0) {
            const candidat = this.trouverMeilleurCandidat(repartition, plafonds);
            if (!candidat) break; // plus personne n'a de marge : on s'arrête pour ne pas dépasser les plafonds

            const ajout = this.calculerMontantAAjouter(reste, candidat.capaciteRestante);
            repartition[candidat.index] += ajout;
            reste -= ajout;
        }
    }

    /** Trouve l'enfant ayant le plus de marge restante (plafond - montant déjà reçu). */
    private trouverMeilleurCandidat(repartition: number[], plafonds: number[]): { index: number; capaciteRestante: number } | null {
        const candidats = repartition
            .map((montant, index) => ({ index, capaciteRestante: plafonds[index] - montant }))
            .filter(c => c.capaciteRestante > 0)
            .sort((a, b) => b.capaciteRestante - a.capaciteRestante);

        return candidats[0] ?? null;
    }

    /** Taille du prochain paquet à ajouter : 1000, puis 500, puis le solde (sans dépasser la marge). */
    private calculerMontantAAjouter(reste: number, capaciteRestante: number): number {
        if (reste >= 1000 && capaciteRestante >= 1000) return 1000;
        if (reste >= 500 && capaciteRestante >= 500) return 500;
        return Math.min(reste, capaciteRestante);
    }
}