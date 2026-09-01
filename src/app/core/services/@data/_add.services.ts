import { inject, Injectable } from "@angular/core";
import { concatStrings } from ".";
import { Absence, AnneeScolaireFamille, AppUser, DemandePaiement, EleveTampon, Famille, FamilleTampon, FraisConfig, H_TAMPON, LogAlerte, MatiereConfig, MsgTemplate, Note, Paiement, PensionTampon, PointageResult, SHEET_TAMPON } from "../../models";
import { GoogleSheetsService } from "../@google-sheets/google-sheets.service";
import { CacheService } from "../cache.service";
import { SheetsQueueServiceService } from "../sheets-queue.service";
import { toRow } from "./helpers";
import { H, SHEET } from "./sheets";

@Injectable({ providedIn: 'root' })
export  class AddServices {
    protected cache = inject(CacheService);
    protected queue = inject(SheetsQueueServiceService);
    protected sheets = inject(GoogleSheetsService);

    async addMatiere(m: MatiereConfig | any): Promise<void> {
        this.cache.upsertMatiere(m); this.queue.enqueue({ sheetName: SHEET.matieres, rowData: toRow(m, H.matieres) }, 'addRow');
    }

    /** Ajoute une pension en tampon */
    addPensionTampon(p: PensionTampon): void {
        this.queue.enqueue({ sheetName: SHEET_TAMPON.pensions, rowData: toRow(p, H_TAMPON.pensions) }, 'addRow');
    }

    /** Enregistre une demande de paiement initiée par le parent */
    addDemandePaiement(d: DemandePaiement): void {
        this.queue.enqueue({ sheetName: SHEET_TAMPON.paiements, rowData: toRow(d, H_TAMPON.paiements) }, 'addRow');
    }

    /** Ajoute une famille en tampon */
    addFamilleTampon(f: FamilleTampon): void {
        this.queue.enqueue({ sheetName: SHEET_TAMPON.familles, rowData: toRow(f, H_TAMPON.familles) }, 'addRow');
    }

    /** Ajoute un élève en tampon */
    addEleveTampon(e: EleveTampon): void {
        this.queue.enqueue({ sheetName: SHEET_TAMPON.eleves, rowData: toRow(e, H_TAMPON.eleves) }, 'addRow');
    }

    addUser(u: AppUser): void {
        this.cache.upsertUser(u); this.queue.enqueue({ sheetName: SHEET.users, rowData: toRow({ ...u, permissions: concatStrings(u.permissions), is_admin: u.is_admin ? 'OUI' : 'NON' }, H.users) }, 'addRow');
    }
    
    // addLog(l: LogAlerte): void {
    //     this.cache.upsertLog(l); this.queue.enqueue({ sheetName: SHEET.logs, rowData: toRow(l, H.logs) }, 'addRow');
    // }

    addTemplate(t: MsgTemplate): void {
        this.cache.upsertTemplate(t); this.queue.enqueue({ sheetName: SHEET.templates, rowData: toRow(t, H.templates) }, 'addRow');
    }

    async addAbsencesBatch(absences: Absence[]): Promise<void> {
        this.cache.addAbsencesBatch(absences); absences.forEach(a => this.queue.enqueue({ sheetName: SHEET.absences, rowData: toRow(a, H.absences) }, 'addRow'));
    }

    async addPointage(a: PointageResult): Promise<void> {
        this.cache.addPointage(a); this.queue.enqueue({ sheetName: SHEET.pointages, rowData: toRow(a, H.pointages) }, 'addRow');
    }

    async saveNotesBatch(notes: Note[]): Promise<void> {
        this.cache.setNotesBatch(notes); notes.forEach(n => this.queue.enqueue({ sheetName: SHEET.notes, rowData: toRow(n, H.notes) }, 'addRow'));
    }

    // async addFrais(f: FraisConfig): Promise<void> {
    //     this.queue.enqueue({ sheetName: SHEET.frais, rowData: toRow(f, H.frais) }, 'addRow');
    // }

    async addPaiement(p: Paiement): Promise<void> {
        this.cache.upsertPaiement(p); this.queue.enqueue({ sheetName: SHEET.paiements, rowData: toRow(p, H.paiements) }, 'addRow');
    }

    async addClasse(c: any): Promise<void> {
        this.cache.upsertClasse(c); this.queue.enqueue({ sheetName: SHEET.classes, rowData: toRow(c, H.classes) }, 'addRow');
    }

    async addEleve(e: any): Promise<void> {
        this.cache.upsertEleve(e); this.queue.enqueue({ sheetName: SHEET.eleves, rowData: toRow(e, H.eleves) }, 'addRow');
    }

    async addAnneeSvc(a: AnneeScolaireFamille) {
        this.cache.upsertAnneeSvc(a); this.queue.enqueue({ sheetName: SHEET.anneesvc, rowData: toRow(a, H.anneesvc) }, 'addRow');
    }

    async addFamille(f: Famille): Promise<void> {
        this.cache.upsertFamille(f); this.queue.enqueue({ sheetName: SHEET.familles, rowData: toRow(f, H.familles) }, 'addRow');
    }

}