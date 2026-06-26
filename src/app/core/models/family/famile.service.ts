import { Injectable } from "@angular/core";
import { ANNEE_SCOLAIRE } from "../shared";
import { AnneeScolaireFamille, FamilleEnrichi } from "./famille.model";
import { Paiement } from "../payment";
import { Classe, Eleve } from "../academic";

const coef_red = 5
@Injectable({
    providedIn: 'root'
})
export class FamilleService {

    anneeSvcEncours(f: FamilleEnrichi): AnneeScolaireFamille | undefined {
        const a = f.annee_scolaires
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
        const attendu = eleves.reduce((s, el) => s + Number(el.classe?.prix ?? 0), 0); + c.prix;

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

}