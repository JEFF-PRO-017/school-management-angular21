import { inject, Injectable } from "@angular/core";
import { deconcatString } from ".";
import { Absence, AppUser, Classe, Eleve, Famille, MsgTemplate, Note, Paiement } from "../../models";
import { SoldeSnap, BulletinSnap } from "../../models/last_index";
import { GoogleSheetsService } from "../@google-sheets/google-sheets.service";
import { CacheService } from "../cache.service";
import { SheetsQueueServiceService } from "../sheets-queue.service";
import { parse } from "./helpers";
import { H, SHEET } from "./sheets";

@Injectable({ providedIn: 'root' })
export  class RefreshServices {
    protected cache = inject(CacheService);
    protected queue = inject(SheetsQueueServiceService);
    protected sheets = inject(GoogleSheetsService);
    
    async refreshFamilles(): Promise<void> {
        const raw = await this.sheets.fetchRaw(SHEET.familles);
        this.cache.setFamilles(parse<Famille>(raw, H.familles));
    }

    async refreshEleves(): Promise<void> {
        const raw = await this.sheets.fetchRaw(SHEET.eleves);
        this.cache.setEleves(parse<Eleve | any>(raw, H.eleves));
    }

    async refreshClasses(): Promise<void> {
        const raw = await this.sheets.fetchRaw(SHEET.classes);
        this.cache.setClasses(parse<Classe | any>(raw, H.classes));
    }

    async refreshPaiements(): Promise<void> {
        const raw = await this.sheets.fetchRaw(SHEET.paiements);
        this.cache.setPaiements(parse<Paiement>(raw, H.paiements));
    }

    async refreshNotes(): Promise<void> {
        const raw = await this.sheets.fetchRaw(SHEET.notes);
        this.cache.setNotes(parse<Note>(raw, H.notes));
    }

    async refreshSoldes(): Promise<void> {
        const raw = await this.sheets.fetchRaw(SHEET.soldes);
        this.cache.setSoldes(parse<SoldeSnap>(raw, H.soldes));
    }

    async refreshBulletins(): Promise<void> {
        const raw = await this.sheets.fetchRaw(SHEET.bulletins);
        this.cache.setBulletins(parse<BulletinSnap>(raw, H.bulletins));
    }

    async refreshAbsences(): Promise<void> {
        const raw = await this.sheets.fetchRaw(SHEET.absences);
        this.cache.setAbsences(parse<Absence>(raw, H.absences));
    }
    async loadTemplates(): Promise<void> {
        const raw = await this.sheets.fetchRaw(SHEET.templates);
        this.cache.setTemplates(parse<MsgTemplate>(raw, H.templates));
    }

    async loadUsers(): Promise<void> {
        const raw = await this.sheets.fetchRaw(SHEET.users);
        this.cache.setUsers(
            parse<AppUser>(raw, H.users).map(u => ({
                ...u,
                is_admin: String(u.is_admin) === 'OUI' || u.is_admin === true,
                permissions: deconcatString(
                    typeof u.permissions === 'string' ? u.permissions : ''
                ),
            }))
        );
    }
}