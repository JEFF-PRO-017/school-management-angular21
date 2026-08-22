import { inject, Injectable } from "@angular/core";
import { AddServices, concatStrings, GetServices, toRow } from ".";
import { SHEET_TAMPON, H_TAMPON, DemandePaiement, MsgTemplate, AppUser, FraisConfig, FamilleTampon, EleveTampon, PensionTampon, MatiereConfig, AnneeScolaireFamille, Famille, Paiement } from "../../models";
import { SHEET, H } from "./sheets";
import { GoogleSheetsService } from "../@google-sheets/google-sheets.service";
import { CacheService } from "../cache.service";
import { SheetsQueueServiceService } from "../sheets-queue.service";

@Injectable({ providedIn: 'root' })
export class PatchServices {
    protected cache = inject(CacheService);
    protected queue = inject(SheetsQueueServiceService);
    protected sheets = inject(GoogleSheetsService);

    private addsv = inject(AddServices);

    /** Refuse une famille tampon (met à jour le statut) */
    async refuserFamilleTampon(idFamille: string): Promise<void> {
        // const row = await this.sheets.findRowById(SHEET_TAMPON.familles, idFamille); if (row === -1) return; const familles = await this.getsv.getFamillesTampon(); const f = familles.find(x => x.id_famille === idFamille); if (!f) return; this.queue.enqueue({ sheetName: SHEET_TAMPON.familles, row, col: 1, values: toRow({ ...f, statut_validation: 'refuse' }, H_TAMPON.familles) }, 'updateRow');
    }

    /** Valide une demande de paiement : crée un vrai Paiement dans F4_PAIEMENTS et met à jour le statut tampon */
    async validerDemandePaiement(d: DemandePaiement): Promise<void> {
        // await this.addsv.addPaiement({ id_paiement: `PAI-${Date.now()}`, id_famille: d.id_famille, montant_verse: d.montant, date_paiement: new Date().toISOString().slice(0, 10), mode_paiement: d.mode_paiement as any, periode_concernee: '', date_prochain_rdv: '', recu_numero: d.reference ?? '', notes_caissier: d.commentaire ?? '', statut_alerte_whatsapp: 'EN_ATTENTE' }); const row = await this.sheets.findRowById(SHEET_TAMPON.paiements, d.id); if (row !== -1) this.queue.enqueue({ sheetName: SHEET_TAMPON.paiements, row, col: 1, values: toRow({ ...d, statut: 'valide' }, H_TAMPON.paiements) }, 'updateRow');
    }

    updateTemplate(t: MsgTemplate): void {
        this.cache.upsertTemplate(t); this.sheets.findRowById(SHEET.templates, t.id_template).then(row => { if (row === -1) return this.addsv.addTemplate(t); this.queue.enqueue({ sheetName: SHEET.templates, row, col: 1, values: toRow(t, H.templates) }, 'updateRow'); });
    }

    updateUser(u: AppUser): void {
        this.cache.upsertUser(u); this.sheets.findRowById(SHEET.users, u.id).then(row => { if (row === -1) return this.addsv.addUser(u); this.queue.enqueue({ sheetName: SHEET.users, row, col: 1, values: toRow({ ...u, permissions: concatStrings(u.permissions), is_admin: u.is_admin ? 'OUI' : 'NON' }, H.users) }, 'updateRow'); });
    }

    async updateFrais(f: FraisConfig): Promise<void> {
        const row = await this.sheets.findRowById(SHEET.frais, f.id_frais); if (row === -1) return this.addsv.addFrais(f); this.queue.enqueue({ sheetName: SHEET.frais, row, col: 1, values: toRow(f, H.frais) }, 'updateRow');
    }

    async validerFamilleTampon(famille: FamilleTampon, eleves: EleveTampon[], pension: PensionTampon | null): Promise<void> {
        // await this.addsv.addFamille({ id_famille: famille.id_famille, nom_famille: famille.nom_famille, tel_pere: famille.tel_pere, tel_mere: famille.tel_mere, tel_autre: famille.tel_autre, adresse_texte: famille.adresse_texte }); for (const e of eleves) { await this.addsv.addEleve({ id_eleve: e.id_eleve, id_famille: famille.id_famille, id_classe: e.id_classe ?? '', nom: e.nom, prenom: e.prenom, date_naissance: e.date_naissance ?? '', sexe: e.sexe ?? undefined, statut: 'actif', matricule: '' }); } const rowFam = await this.sheets.findRowById(SHEET_TAMPON.familles, famille.id_famille); if (rowFam !== -1) this.queue.enqueue({ sheetName: SHEET_TAMPON.familles, row: rowFam, col: 1, values: toRow({ ...famille, statut_validation: 'valide' }, H_TAMPON.familles) }, 'updateRow');
    }

    async updateMatiere(m: MatiereConfig | any): Promise<void> {
        this.cache.upsertMatiere(m); const row = await this.sheets.findRowById(SHEET.matieres, m.id_matiere); if (row === -1) return this.addsv.addMatiere(m); this.queue.enqueue({ sheetName: SHEET.matieres, row, col: 1, values: toRow(m, H.matieres) }, 'updateRow');
    }

    async updateClasse(c: any): Promise<void> {
        this.cache.upsertClasse(c); const row = await this.sheets.findRowById(SHEET.classes, c.id_classe); if (row === -1) return this.addsv.addClasse(c); this.queue.enqueue({ sheetName: SHEET.classes, row, col: 1, values: toRow(c, H.classes) }, 'updateRow');
    }

    async updateEleve(e: any): Promise<void> {
        this.cache.upsertEleve(e); const row = await this.sheets.findRowById(SHEET.eleves, e.id_eleve); if (row === -1) return this.addsv.addEleve(e); this.queue.enqueue({ sheetName: SHEET.eleves, row, col: 1, values: toRow(e, H.eleves) }, 'updateRow');
    }

    async deleteEleve(id: string): Promise<void> {
        const e = this.cache.getEleves().find(x => x.id_eleve === id); if (e) await this.updateEleve({ ...e, statut: 'archive' });
    }

    async updateAnneeSvc(a: AnneeScolaireFamille) {
        this.cache.upsertAnneeSvc(a); const row = await this.sheets.findRowById(SHEET.anneesvc, a.id_annee_scolaire); if (row === -1) return this.addsv.addAnneeSvc(a); this.queue.enqueue({ sheetName: SHEET.anneesvc, row, col: 1, values: toRow(a, H.anneesvc) }, 'updateRow');
    }

    async updateFamille(f: Famille): Promise<void> {
        this.cache.upsertFamille(f); const row = await this.sheets.findRowById(SHEET.familles, f.id_famille); if (row === -1) return this.addsv.addFamille(f); this.queue.enqueue({ sheetName: SHEET.familles, row, col: 1, values: toRow(f, H.familles) }, 'updateRow');
    }

    // dans PatchServices
    async updatePaiement(p: Paiement): Promise<void> {
        this.cache.upsertPaiement(p);
        const row = await this.sheets.findRowById(SHEET.paiements, p.id_paiement);
        if (row === -1) return this.addsv.addPaiement(p);
        this.queue.enqueue({ sheetName: SHEET.paiements, row, col: 1, values: toRow(p, H.paiements) }, 'updateRow');
    }

}