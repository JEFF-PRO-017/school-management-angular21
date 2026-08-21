import { inject, Injectable } from "@angular/core";
import { AppUser, DemandePaiement, Eleve, EleveTampon, Enseignant, FamilleTampon, FraisConfig, H_TAMPON, MatiereConfig, MsgTemplate, Paiement, PensionTampon, SHEET_TAMPON } from "../../models";
import { Classe, SoldeSnap } from "../../models/last_index";
import { GoogleSheetsService } from "../@google-sheets/google-sheets.service";
import { CacheService } from "../cache.service";
import { SheetsQueueServiceService } from "../sheets-queue.service";
import { parse } from "./helpers";
import { mockDB } from "../../../../../public/mocdata";

@Injectable({ providedIn: 'root' })
export class GetServices {
    protected cache = inject(CacheService);
    protected queue = inject(SheetsQueueServiceService);
    protected sheets = inject(GoogleSheetsService);

    getClasses(): Classe[] { return this.cache.getClasses(); }
    getFamilles(): any[] { return this.cache.getFamilles(); }
    getEleves(): Eleve[] | any[] { return this.cache.getEleves(); }
    getMatieres(): MatiereConfig[] | any[] { return this.cache.getMatieres(); }
    getFrais(): FraisConfig[] { return this.cache.getFrais(); }
    getEnseignants(): Enseignant[] { return this.cache.getEnseignants(); }
    getSoldes(): SoldeSnap[] { return this.cache.getSoldes(); }
    getPaiements(): Paiement[] { return this.cache.getPaiements(); }
    getTemplates(): MsgTemplate[] {
        return this.cache.getTemplates().filter(t => t.actif);
    }

    async getFamillesTampon(): Promise<FamilleTampon[]> {
        const raw = await this.sheets.fetchRaw(SHEET_TAMPON.familles);
        return parse<FamilleTampon>(raw, H_TAMPON.familles);
    }

    /** Charge tous les élèves tampon */
    async getElevesTampon(): Promise<EleveTampon[]> {
        const raw = await this.sheets.fetchRaw(SHEET_TAMPON.eleves);
        return parse<EleveTampon>(raw, H_TAMPON.eleves);
    }

    /** Charge toutes les pensions tampon */
    async getPensionsTampon(): Promise<PensionTampon[]> {
        const raw = await this.sheets.fetchRaw(SHEET_TAMPON.pensions);
        return parse<PensionTampon>(raw, H_TAMPON.pensions);
    }

    /** Charge toutes les demandes de paiement initiées */
    async getDemandePaiements(): Promise<DemandePaiement[]> {
        const raw = await this.sheets.fetchRaw(SHEET_TAMPON.paiements);
        return parse<DemandePaiement>(raw, H_TAMPON.paiements);
    }

    async loadUsers(): Promise<void> {
        // const raw = await this.sheets.fetchRaw(SHEET.users);
        // this.cache.setUsers(
        //   this.parse<AppUser>(raw, H.users).map(u => ({
        //     ...u,
        //     is_admin: String(u.is_admin) === 'OUI' || u.is_admin === true,
        //     permissions: deconcatString(
        //       typeof u.permissions === 'string' ? u.permissions : ''
        //     ),
        //   }))
        // );
        this.cache.setUsers(mockDB.users as AppUser[])
    }
    getUsers(): AppUser[] | any[] {
        return this.cache.getUsers();
    }

}