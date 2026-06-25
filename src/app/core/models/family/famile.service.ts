import { Injectable } from "@angular/core";
import { ANNEE_SCOLAIRE } from "../shared";
import { AnneeScolaireFamille } from "./famille.model";
import { Paiement } from "../payment";

@Injectable({
    providedIn: 'root'
})
export class FamilleService {

    anneeSvcEncours(a: AnneeScolaireFamille[] | undefined): AnneeScolaireFamille | undefined {
        return a ? a.find(a => a.annee_scolaire === ANNEE_SCOLAIRE) : undefined
    }
    attentu(a: AnneeScolaireFamille | undefined) { return (a?.montant_total_attendu ?? 0) - (a?.montant_reduction ?? 0) - (a?.montant_reduction_special ?? 0) }
    verse(p: Paiement[]) { return (p ?? []).reduce((s, p) => s + (+p.montant_verse), 0); }
    restant(attentu: number, verse: number) { return Math.max(0, attentu - verse) }
}