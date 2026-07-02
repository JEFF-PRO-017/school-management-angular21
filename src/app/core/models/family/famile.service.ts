import { Injectable } from "@angular/core";
import { ANNEE_SCOLAIRE, POURCENT_PENSION } from "../shared";
import { AnneeScolaireFamille, EleveEnrichi, FamilleEnrichi } from "./famille.model";
import { Classe, Eleve } from "../academic";
import { EleveData } from "../../../features/insolvables/insolvables-list/insolvables-list.component";

interface FamilleData {
    anneeSvcEncours: AnneeScolaireFamille | undefined,
    montantAttentu: number,
    montantVerse: number,
    montantRestant: number,
    dernierRdvFamille: string | null
}
const coef_red = 5
@Injectable({
    providedIn: 'root'
})
export class FamilleService {

    initService(f: FamilleEnrichi): FamilleData {
        const anneeSvcEncours = this.anneeSvcEncours(f)
        const montantAttentu = this.montantAttentu(f);
        const montantVerse = this.montantVerse(f);
        const montantRestant = this.montantRestant(montantAttentu, montantVerse);
        const dernierRdvFamille = this.dernierRdvFamille(f)

        return {
            anneeSvcEncours,
            montantAttentu,
            montantVerse,
            montantRestant,
            dernierRdvFamille
        }

    }

    anneeSvcEncours(f: FamilleEnrichi|null): AnneeScolaireFamille | undefined {
        const a = f?.annee_scolaires
        return a ? a.find(a => a.annee_scolaire === ANNEE_SCOLAIRE) : undefined
    }

    montantAttentu(f: FamilleEnrichi | null): number {
        if (!f) return 0
        const a = this.anneeSvcEncours(f)
        return (a?.montant_total_attendu ?? 0) - (a?.montant_reduction ?? 0) - (a?.montant_reduction_special ?? 0)
    }
    montantVerse(f: FamilleEnrichi | null): number {
        if (!f) return 0
        const p = f.paiements
        return (p ?? []).reduce((s, p) => s + (+p.montant_verse), 0);
    }

    montantRestant(attentu: number, verse: number) { return Math.max(0, attentu - verse) }

    upateAnneeSvc(f: FamilleEnrichi, e: Eleve, c: Classe | any): AnneeScolaireFamille | null {
        const anneeSvc = this.anneeSvcEncours(f);
        if (!anneeSvc) return null;

        const eleves = (f.eleves ?? []).filter(el => el.id_eleve !== e.id_eleve)
        // Prix des élèves existants + prix de la nouvelle classe
        const attendu = eleves.reduce((s, el) => s + Number(el.classe?.prix ?? 0), 0) + Number(c.prix ?? 0);

        // Réduction si plus de 2 enfants (existants + le nouveau)
        const nbTotal = eleves.length + 1;
        const reduction = nbTotal > 2 ? attendu * coef_red / 100 : 0;

        return {
            ...anneeSvc,
            montant_total_attendu: attendu,
            montant_reduction: reduction,
        };
    }

    deleteAnneeSvc(f: FamilleEnrichi, e: Eleve): AnneeScolaireFamille | null {
        const anneeSvc = this.anneeSvcEncours(f);
        if (!anneeSvc) return null;

        // Prix des élèves restants après suppression
        const attendu = (f.eleves ?? [])
            .filter(el => el.id_eleve !== e.id_eleve)
            .reduce((s, el) => s + Number(el.classe?.prix ?? 0), 0);

        const nbTotal = (f.eleves ?? []).length - 1;
        const reduction = nbTotal > 2 ? attendu * coef_red / 100 : 0;

        return {
            ...anneeSvc,
            montant_total_attendu: attendu,
            montant_reduction: reduction,
        };
    }

    dernierRdvFamille(f: FamilleEnrichi | any): string | null {
        if (!f) return null;
        const rdvs = (f.moratoires ?? [])
            .filter((m: any) => !m.regler && m.date_fin)
            .map((m: any) => m.date_fin as string);
        return rdvs.length ? rdvs.sort().at(-1)! : null;
    }

    construireElevesDataAvecFamille(familles: FamilleEnrichi[]): EleveData[] {
        const aujourd = new Date().toISOString().slice(0, 10);
        const result: EleveData[] = [];

        for (const famille of familles) {
            const elevesActifs = famille.eleves ?? [];
            const nb_enfants_famille = elevesActifs.length;
            if (nb_enfants_famille === 0) continue;

            const fs = this.initService(famille);
            const attendu_famille = fs.montantAttentu;
            const verse_famille = fs.montantVerse;
            const restant_famille = fs.montantRestant;
            const dernierRdv = fs.dernierRdvFamille;  // string | null

            const moratoire_depasse = dernierRdv ? dernierRdv < aujourd : false;
            const insolvable = attendu_famille > 0 &&
                ((verse_famille * 100) / attendu_famille) < POURCENT_PENSION;

            // Imputation séquentielle : on remplit chaque pension dans l'ordre
            let reste_a_imputer = verse_famille;

            elevesActifs.forEach((eleve: EleveEnrichi, i: number) => {
                const pension = eleve.classe?.prix ?? 0;
                let montant_par_enfant: number;

                if (i === nb_enfants_famille - 1) {
                    // Dernier enfant : prend tout ce qui reste (peut être 0)
                    montant_par_enfant = Math.max(0, Math.min(pension, reste_a_imputer));
                } else {
                    // Remplit sa pension au maximum du disponible
                    montant_par_enfant = Math.max(0, Math.min(pension, reste_a_imputer));
                }

                reste_a_imputer -= montant_par_enfant;

                result.push({
                    ...eleve,
                    nb_enfants_famille,
                    montant_par_enfant,
                    reste_par_enfant: Math.max(0, pension - montant_par_enfant),
                    verse_famille,
                    attendu_famille,
                    restant_famille,
                    moratoire_depasse,
                    insolvable,
                });
            });
        }

        console.log("result",result)
        return result;
    }
}