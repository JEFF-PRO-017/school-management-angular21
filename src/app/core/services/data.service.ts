// ─────────────────────────────────────────────────────────────────
// data.service.ts — modèle Famille unifié (frais intégrés)
// ─────────────────────────────────────────────────────────────────
import { Injectable, inject } from '@angular/core';
import { CacheService } from './cache.service';
import { SheetsQueueServiceService } from './sheets-queue.service';
import { GoogleSheetsService } from './@google-sheets/google-sheets.service';
import {
  Famille, Eleve, Classe, FraisConfig, Enseignant,
  MatiereConfig, SoldeSnap, BulletinSnap, Paiement, Note, MsgTemplate,
  LogAlerte
} from '../models';

const SHEET = {
  familles: 'F1_FAMILLES',
  eleves: 'F2_ELEVES',
  classes: 'F3_CLASSES',
  paiements: 'F4_PAIEMENTS',
  frais: 'F5_FRAIS_CONFIG',
  notes: `F6_${new Date().getFullYear()}`,
  templates: 'F7_MSG_TEMPLATES',
  logs: 'F8_LOG_ALERTES',
  soldes: 'F9_SNAP',
  enseignants: 'F10_ENSEIGNANTS',
  bulletins: 'F11_SNAP',
  matieres: 'F12_MATIERES_CONFIG',
} as const;

// Famille inclut maintenant les champs pension directement
const H = {
  familles: [
    'id_famille', 'nom_famille', 'tel_pere', 'tel_mere', 'tel_autre',
    'latitude', 'longitude', 'adresse_texte',
    'montant_total_attendu', 'annee_scolaire', 'montant_reduction', 'commentaire'
  ],
  eleves: ['id_eleve', 'id_famille', 'id_classe', 'nom', 'prenom', 'date_naissance', 'date_inscription', 'statut', 'lieu_naissance', 'sexe', 'matricule'],
  classes: ['id_classe', 'nom_classe', 'niveau', 'cycle', 'annee_scolaire', 'effectif_max', 'enseignant_principal'],
  paiements: ['id_paiement', 'id_famille', 'montant_verse', 'date_paiement', 'mode_paiement', 'periode_concernee', 'date_prochain_rdv', 'recu_numero', 'notes_caissier', 'statut_alerte_whatsapp'],
  frais: ['id_frais', 'id_famille', 'id_classe', 'type_frais', 'montant_total_attendu', 'montant_reduction', 'seuil_insolvable', 'annee_scolaire', 'commentaire'],
  notes: ['id_note', 'id_eleve', 'id_classe', 'matiere', 'id_enseignant', 'sequence', 'note_obtenue', 'note_sur', 'annee_scolaire'],
  enseignants: ['id_enseignant', 'nom', 'prenom', 'tel', 'email', 'classes_assignees'],
  matieres: ['id_matiere', 'nom_matiere', 'id_classe', 'coefficient', 'note_eliminatoire', 'groupe', 'niveau', 'id_enseignant'],
  soldes: ['id_eleve', 'id_famille', 'total_verse', 'montant_attendu', 'reste_a_payer', 'statut_insolvable', 'dernier_paiement', 'nb_enfants_famille'],
  bulletins: ['id_eleve', 'id_classe', 'sequence', 'moy_ponderee', 'rang', 'premier', 'dernier', 'mention', 'moy_classe'],
  templates: ['id_template', 'type', 'objet', 'contenu', 'variables_dynamiques', 'actif', 'langue', 'destinataire'],
  logs: ['id_log', 'id_eleve', 'id_famille', 'id_template', 'numero_dest', 'date_envoi', 'statut', 'hash_dedup'],
} as const;

@Injectable({ providedIn: 'root' })
export class DataService {

  private cache = inject(CacheService);
  private queue = inject(SheetsQueueServiceService);
  private sheets = inject(GoogleSheetsService);

  // ── Démarrage ──────────────────────────────────────────────────

  async initAppData(): Promise<void> {
    await this.ensureSheets();

    const [rawFam, rawCls, rawFrais, rawEns, rawMat] = await this.batchFetch([
      `${SHEET.familles}!A:L`,   // 12 colonnes avec les frais intégrés
      `${SHEET.classes}!A:G`,
      `${SHEET.frais}!A:I`,
      `${SHEET.enseignants}!A:F`,
      `${SHEET.matieres}!A:H`,
    ]);
    this.cache.setFamilles(this.parse<Famille>(rawFam, H.familles));
    this.cache.setClasses(this.parse<Classe>(rawCls, H.classes));
    this.cache.setFrais(this.parse<FraisConfig>(rawFrais, H.frais));
    this.cache.setEnseignants(this.parse<Enseignant>(rawEns, H.enseignants));
    this.cache.setMatieres(this.parse<MatiereConfig>(rawMat, H.matieres));

    const [rawElv, rawSol] = await this.batchFetch([
      `${SHEET.eleves}!A:K`,
      `${SHEET.soldes}!A:H`,
    ]);
    this.cache.setEleves(this.parse<Eleve>(rawElv, H.eleves));
    this.cache.setSoldes(this.parse<SoldeSnap>(rawSol, H.soldes));

    this.sheets.fetchRaw(SHEET.notes).then(r =>
      this.cache.setNotes(this.parse<Note>(r, H.notes))
    );
    this.sheets.fetchRaw(SHEET.paiements).then(r =>
      this.cache.setPaiements(this.parse<Paiement>(r, H.paiements))
    );

    await this.loadTemplates();
  }

  // ── Getters ────────────────────────────────────────────────────

  getClasses(): Classe[] { return this.cache.getClasses(); }
  getFamilles(): Famille[] { return this.cache.getFamilles(); }
  getEleves(): Eleve[] { return this.cache.getEleves(); }
  getMatieres(): MatiereConfig[] { return this.cache.getMatieres(); }
  getFrais(): FraisConfig[] { return this.cache.getFrais(); }
  getEnseignants(): Enseignant[] { return this.cache.getEnseignants(); }
  getSoldes(): SoldeSnap[] { return this.cache.getSoldes(); }
  getPaiements(): Paiement[] { return this.cache.getPaiements(); }

  // ── Familles ───────────────────────────────────────────────────

  async addFamille(f: Famille): Promise<void> {
    this.cache.upsertFamille(f);
    this.queue.enqueue(
      { sheetName: SHEET.familles, rowData: this.toRow(f, H.familles) },
      'addRow'
    );
  }

  async updateFamille(f: Famille): Promise<void> {
    this.cache.upsertFamille(f);
    const row = await this.sheets.findRowById(SHEET.familles, f.id_famille);
    if (row === -1) { return this.addFamille(f); }
    this.queue.enqueue(
      { sheetName: SHEET.familles, row, col: 1, values: this.toRow(f, H.familles) },
      'updateRow'
    );
  }

  async deleteFamille(id: string): Promise<void> {
    this.cache.removeFamille(id);
    const row = await this.sheets.findRowById(SHEET.familles, id);
    if (row === -1) return;
    this.queue.enqueue({ sheetName: SHEET.familles, rowIndex: row - 1 }, 'deleteRow');
  }

  // ── Élèves ─────────────────────────────────────────────────────

  async addEleve(e: Eleve): Promise<void> {
    this.cache.upsertEleve(e);
    this.queue.enqueue(
      { sheetName: SHEET.eleves, rowData: this.toRow(e, H.eleves) },
      'addRow'
    );
  }

  async updateEleve(e: Eleve): Promise<void> {
    this.cache.upsertEleve(e);
    const row = await this.sheets.findRowById(SHEET.eleves, e.id_eleve);
    if (row === -1) { return this.addEleve(e); }
    this.queue.enqueue(
      { sheetName: SHEET.eleves, row, col: 1, values: this.toRow(e, H.eleves) },
      'updateRow'
    );
  }

  async deleteEleve(id: string): Promise<void> {
    const e = this.cache.getEleves().find(x => x.id_eleve === id);
    if (e) await this.updateEleve({ ...e, statut: 'archive' });
  }

  // ── Classes ────────────────────────────────────────────────────

  async addClasse(c: Classe): Promise<void> {
    this.cache.upsertClasse(c);
    this.queue.enqueue(
      { sheetName: SHEET.classes, rowData: this.toRow(c, H.classes) },
      'addRow'
    );
  }

  async updateClasse(c: Classe): Promise<void> {
    this.cache.upsertClasse(c);
    const row = await this.sheets.findRowById(SHEET.classes, c.id_classe);
    if (row === -1) { return this.addClasse(c); }
    this.queue.enqueue(
      { sheetName: SHEET.classes, row, col: 1, values: this.toRow(c, H.classes) },
      'updateRow'
    );
  }

  // ── Paiements ──────────────────────────────────────────────────

  async addPaiement(p: Paiement): Promise<void> {
    this.cache.upsertPaiement(p);
    this.updateSoldeLocal(p);
    this.queue.enqueue(
      { sheetName: SHEET.paiements, rowData: this.toRow(p, H.paiements) },
      'addRow'
    );
  }

  async getPaiementsEleve(idFamille: string): Promise<Paiement[]> {
    const cached = this.cache.getPaiements();
    if (cached.length) return cached.filter(p => p.id_famille === idFamille);
    const raw = await this.sheets.fetchRaw(SHEET.paiements);
    const all = this.parse<Paiement>(raw, H.paiements);
    this.cache.setPaiements(all);
    return all.filter(p => p.id_famille === idFamille);
  }

  // ── Frais config (par classe) ──────────────────────────────────

  async addFrais(f: FraisConfig): Promise<void> {
    this.queue.enqueue(
      { sheetName: SHEET.frais, rowData: this.toRow(f, H.frais) },
      'addRow'
    );
  }

  async updateFrais(f: FraisConfig): Promise<void> {
    const row = await this.sheets.findRowById(SHEET.frais, f.id_frais);
    if (row === -1) { return this.addFrais(f); }
    this.queue.enqueue(
      { sheetName: SHEET.frais, row, col: 1, values: this.toRow(f, H.frais) },
      'updateRow'
    );
  }

  // ── Notes ──────────────────────────────────────────────────────

  async saveNotesBatch(notes: Note[]): Promise<void> {
    this.cache.setNotesBatch(notes);
    notes.forEach(n => this.queue.enqueue(
      { sheetName: SHEET.notes, rowData: this.toRow(n, H.notes) },
      'addRow'
    ));
  }

  async deleteNotesBatch(noteIds: string[]): Promise<void> {
    this.cache.deleteNotesBatch(noteIds);
    const rows = await Promise.all(
      noteIds.map(id => this.sheets.findRowById(SHEET.notes, id))
    );
    noteIds
      .map((id, i) => ({ id, row: rows[i] }))
      .filter(x => x.row !== -1)
      .sort((a, b) => b.row - a.row)
      .forEach(x => this.queue.enqueue(
        { sheetName: SHEET.notes, rowIndex: x.row - 1 },
        'deleteRow'
      ));
  }

  // ── Snapshots ──────────────────────────────────────────────────

  async refreshSoldes(): Promise<void> {
    this.cache.setSoldes(this.parse<SoldeSnap>(
      await this.sheets.fetchRaw(SHEET.soldes), H.soldes
    ));
  }

  async refreshBulletins(): Promise<void> {
    this.cache.setBulletins(this.parse<BulletinSnap>(
      await this.sheets.fetchRaw(SHEET.bulletins), H.bulletins
    ));
  }

  // ── Lecture générique ──────────────────────────────────────────

  // Cache local templates (non persisté entre sessions — rechargé au besoin)

  /** Charge les templates WhatsApp depuis Sheets et les met en cache local */
  async loadTemplates(): Promise<void> {
    const raw = await this.sheets.fetchRaw(SHEET.templates);
    this.cache.setTemplates(this.parse<MsgTemplate>(raw, H.templates));
  }

  /** Retourne les templates actifs depuis le cache local */
  getTemplates(): MsgTemplate[] {
    return this.cache.getTemplates().filter(t => t.actif);
  }

  addTemplate(t: MsgTemplate): void {
    this.cache.upsertTemplate(t);
    this.queue.enqueue(
      { sheetName: SHEET.templates, rowData: this.toRow(t, H.templates) },
      'addRow'
    );
  }


  updateTemplate(t: MsgTemplate): void {
    this.cache.upsertTemplate(t);
    this.sheets.findRowById(SHEET.templates, t.id_template).then(row => {
      if (row === -1) { return this.addTemplate(t); }
      this.queue.enqueue(
        { sheetName: SHEET.templates, row, col: 1, values: this.toRow(t, H.templates) },
        'updateRow'
      );
    });
  }

  loadLogs(): LogAlerte[] {
    this.sheets.fetchRaw(SHEET.logs).then(raw => {
      this.cache.setLogs(this.parse<LogAlerte>(raw, H.logs));
    });
    return this.cache.getLogs();
  }

  getLogs(): LogAlerte[] {
    return this.cache.getLogs();
  }

  addLogs(l: LogAlerte): void {
    this.cache.upsertLog(l);
    this.queue.enqueue(
      { sheetName: SHEET.logs, rowData: this.toRow(l, H.logs) },
      'addRow'
    );
  }

  async readSheetPublic<T>(sheetName: string): Promise<T[]> {
    const map: Partial<Record<string, readonly string[]>> = {
      [SHEET.templates]: H.templates,
      [SHEET.logs]: H.logs,
    };
    const headers = map[sheetName];
    if (!headers) { console.warn(`readSheetPublic : feuille inconnue "${sheetName}"`); return []; }
    return this.parse<T>(await this.sheets.fetchRaw(sheetName), headers);
  }

  // ── Helpers privés ─────────────────────────────────────────────

  private toRow(obj: any, headers: readonly string[]): any[] {
    return headers.map(k => obj[k] ?? '');
  }

  private parse<T>(rows: any[][], headers: readonly string[]): T[] {
    if (!rows?.length) return [];
    return rows.slice(1).filter(r => r.length && r[0]).map(row => {
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
      return obj as T;
    });
  }

  private async batchFetch(ranges: string[]): Promise<any[][][]> {
    return (await this.sheets.batchGet(ranges)).filter((_, i) => i % 2 === 0);
  }

  private updateSoldeLocal(p: Paiement): void {
    const s = this.cache.getSoldes().find(x => x.id_famille === p.id_famille);
    if (!s) return;
    const reste = Math.max(0, +s.reste_a_payer - +p.montant_verse);
    this.cache.upsertSolde({
      ...s,
      total_verse: +s.total_verse + +p.montant_verse,
      reste_a_payer: reste,
      statut_insolvable: String(reste > 0),
      dernier_paiement: p.date_paiement,
    });
  }

  private async ensureSheets(): Promise<void> {
    const entries = Object.entries(SHEET) as [keyof typeof SHEET, string][];
    await Promise.all(
      entries
        .filter(([key]) => key in H)
        .map(([key, name]) => this.sheets.createSheet({
          sheetName: name,
          headers: H[key as keyof typeof H] as unknown as string[],
        }))
    );
  }
}