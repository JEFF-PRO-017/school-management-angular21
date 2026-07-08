import { Injectable } from "@angular/core";
import { ANNEE_SCOLAIRE, POURCENT_PENSION } from "../shared";
import { AnneeScolaireFamille, EleveEnrichi, FamilleEnrichi } from "./famille.model";
import { Classe, Eleve } from "../academic";
import { EleveData } from "../../../features/insolvables/insolvables-list/insolvables-list.component";

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
        const annees = f?.annee_scolaires;
        return annees ? annees.find(a => a.annee_scolaire === ANNEE_SCOLAIRE) : undefined;
    }

    /** Montant réellement dû (attendu moins les réductions). */
    montantAttentu(f: FamilleEnrichi | null): number {
        if (!f) return 0;
        const a = this.anneeSvcEncours(f);
        return (a?.montant_total_attendu ?? 0) - (a?.montant_reduction ?? 0) - (a?.montant_reduction_special ?? 0);
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
        return (a?.montant_reduction ?? 0) + (a?.montant_reduction_special ?? 0);
    }

    /** Date d'échéance la plus récente parmi les moratoires non réglés. */
    dernierRdvFamille(f: FamilleEnrichi | any): string | null {
        if (!f) return null;
        const datesMoratoiresEnAttente: string[] = (f.moratoires ?? [])
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

    /** Construit les fiches de tous les élèves d'une même famille. */
    private construireDonneesPourFamille(famille: FamilleEnrichi, aujourdhui: string): EleveData[] {
        const elevesActifs = famille.eleves ?? [];
        const nbEnfantsFamille = elevesActifs.length;
        if (nbEnfantsFamille === 0) return [];

        const fs = this.initService(famille);
        const moratoireDepasse = this.estMoratoireDepasse(fs.dernierRdvFamille, aujourdhui);
        const insolvable = this.estInsolvable(fs.montantAttentu, fs.montantVerse);

        // Prix de la classe de chaque enfant (utilisé pour calculer son reste à payer).
        const montantDuParEleve = elevesActifs.map(e => Number(e.classe?.prix ?? 0));

        const reductionsParEleve = this.repartirMontantIntelligent(fs.reductionTotal, nbEnfantsFamille);
        const versementsParEleve = this.repartirMontantIntelligent(fs.montantVerse, nbEnfantsFamille);

        const contexte: ContexteEleve = {
            nbEnfantsFamille, fs, moratoireDepasse, insolvable,
            reductionsParEleve, versementsParEleve, montantDuParEleve
        };
        const eleves = elevesActifs.map((eleve, index) => this.construireEleveData(eleve, index, contexte));
        console.log('eleves', eleves)
        return eleves;
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
    // 4. RÉPARTITION D'UN MONTANT ENTRE PLUSIEURS ENFANTS
    // =========================================================================

    /**
     * Répartit un montant entre N enfants en évitant les montants bizarres.
     * La somme des parts renvoyées est toujours égale à `montantTotal`.
     */
    repartirMontantIntelligent(montantTotal: number, nombreEnfants: number): number[] {
        if (nombreEnfants === 0) return [];

        const montantBase = Math.floor(montantTotal / nombreEnfants);
        const montantArrondi = this.arrondirMontantParEnfant(montantBase);

        const repartition = new Array(nombreEnfants).fill(montantArrondi);
        this.distribuerLeReste(montantTotal, repartition);

        return repartition;
    }

    /** Arrondit vers le bas : au millier si >= 5000, sinon à la demi-centaine. */
    private arrondirMontantParEnfant(montantBase: number): number {
        if (montantBase < 500) return montantBase;

        return montantBase >= SEUIL_ARRONDI_MILLIER
            ? Math.floor(montantBase / 1000) * 1000
            : Math.floor(montantBase / 500) * 500;
    }

    /** Distribue le reliquat de l'arrondi, enfant par enfant, par paquets ronds. */
    private distribuerLeReste(montantTotal: number, repartition: number[]): void {
        let reste = montantTotal - repartition.reduce((somme, m) => somme + m, 0);
        let index = 0;

        while (reste > 0) {
            const ajout = this.calculerMontantAAjouter(reste);
            repartition[index % repartition.length] += ajout;
            reste -= ajout;
            index++;
        }
    }

    /** Taille du prochain paquet à ajouter : 1000, puis 500, puis le solde. */
    private calculerMontantAAjouter(reste: number): number {
        if (reste >= 1000) return 1000;
        if (reste >= 500) return 500;
        return reste;
    }
}