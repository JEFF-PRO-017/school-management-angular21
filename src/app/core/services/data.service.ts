// data.service.ts — service de données principal
// Stratégie rowIndex : chaque entrée du cache conserve son numéro de ligne Sheets
// (ligne 1 = en-têtes ignorée, ligne 2 = index 2, etc.)
// Ainsi updateCell et deleteRow connaissent toujours le bon index sans appel réseau
import { Injectable, inject } from '@angular/core';
import { CacheService } from './cache.service';
import { SheetsQueueServiceService } from './sheets-queue.service';
import {
  Famille, Eleve, Classe, FraisConfig, Enseignant,
  MatiereConfig, SoldeSnap, BulletinSnap, Paiement, Note
} from '../models';
import { environment } from '../../../environments/environment';
import { GoogleSheetsService } from './@google-sheets/google-sheets.service';

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const YEAR = new Date().getFullYear();

// ── Noms des feuilles ──────────────────────────────────────────────────
const SHEETS = {
  familles: 'F1_FAMILLES',
  eleves: 'F2_ELEVES',
  classes: 'F3_CLASSES',
  paiements: 'F4_PAIEMENTS',
  frais: 'F5_FRAIS_CONFIG',
  notes: `F6_${YEAR}`,
  msgTemplates: 'F7_MSG_TEMPLATES',
  logAlertes: 'F8_LOG_ALERTES',
  soldesSnap: 'F9_SNAP',
  enseignants: 'F10_ENSEIGNANTS',
  bulletinsSnap: 'F11_SNAP',
  matieres: 'F12_MATIERES_CONFIG',
} as const;

// ── En-têtes de colonnes (ordre = colonnes A, B, C…) ──────────────────
const HEADERS = {
  familles: ['id_famille', 'nom_famille', 'tel_pere', 'tel_mere', 'tel_autre', 'latitude', 'longitude', 'adresse_texte'],
  eleves: ['id_eleve', 'id_famille', 'id_classe', 'nom', 'prenom', 'date_naissance', 'date_inscription', 'statut'],
  classes: ['id_classe', 'nom_classe', 'niveau', 'cycle', 'annee_scolaire', 'effectif_max', 'enseignant_principal'],
  paiements: ['id_paiement', 'id_eleve', 'id_famille', 'montant_verse', 'date_paiement', 'mode_paiement', 'periode_concernee', 'date_prochain_rdv', 'recu_numero', 'notes_caissier', 'statut_alerte_whatsapp'],
  frais: ['id_frais', 'id_classe', 'type_frais', 'montant_total_attendu', 'seuil_insolvable', 'echeance_1', 'echeance_2', 'echeance_3', 'annee_scolaire'],
  notes: ['id_note', 'id_eleve', 'id_classe', 'matiere', 'id_enseignant', 'sequence', 'note_obtenue', 'note_sur', 'annee_scolaire'],
  enseignants: ['id_enseignant', 'nom', 'prenom', 'matieres_enseignees', 'tel', 'email', 'classes_assignees'],
  matieres: ['id_matiere', 'nom_matiere', 'id_classe', 'coefficient', 'note_eliminatoire'],
  soldesSnap: ['id_eleve', 'id_famille', 'total_verse', 'montant_attendu', 'reste_a_payer', 'statut_insolvable', 'dernier_paiement', 'nb_enfants_famille'],
  bulletinsSnap: ['id_eleve', 'id_classe', 'sequence', 'moy_ponderee', 'rang', 'premier', 'dernier', 'mention', 'moy_classe'],
  msgTemplates: ['id_template', 'type', 'objet', 'contenu', 'variables_dynamiques', 'actif', 'langue', 'destinataire'],
  logAlertes: ['id_log', 'id_eleve', 'id_famille', 'id_template', 'numero_dest', 'date_envoi', 'statut', 'hash_dedup'],
};

// ── Index de lignes stocké en mémoire : sheetName → id → rowIndex ────
// Évite un appel réseau findRowById avant chaque update
type RowIndexMap = Map<string, Map<string, number>>;

@Injectable({ providedIn: 'root' })
export class DataService {

  private cache = inject(CacheService);
  private queue = inject(SheetsQueueServiceService);
  private sheets = inject(GoogleSheetsService);

  // Dictionnaire sheetName → (id → numéro de ligne dans Sheets)
  private rowIndex: RowIndexMap = new Map();

  // ─────────────────────────────────────────────────
  // DÉMARRAGE : batchGet (Groupe A + B + D en 2 appels)
  // ─────────────────────────────────────────────────

  async initAppData(): Promise<void> {

    this.createSheets(); // Création des feuilles si elles n'existent pas (idempotent)
    // Appel 1 : Groupe A — référentiels stables (cache 24h)
    const groupeA = await this.sheets.batchGet([
      `${SHEETS.familles}!A:H`,
      `${SHEETS.classes}!A:G`,
      `${SHEETS.frais}!A:I`,
      `${SHEETS.enseignants}!A:G`,
      `${SHEETS.matieres}!A:E`,
    ]);

    const familles = this.parseWithIndex(groupeA[0], HEADERS.familles, SHEETS.familles, 'id_famille') as Famille[];
    const classes = this.parseWithIndex(groupeA[2], HEADERS.classes, SHEETS.classes, 'id_classe') as Classe[];
    const frais = this.parseWithIndex(groupeA[4], HEADERS.frais, SHEETS.frais, 'id_frais') as FraisConfig[];
    const enseignants = this.parseWithIndex(groupeA[6], HEADERS.enseignants, SHEETS.enseignants, 'id_enseignant') as Enseignant[];
    const matieres = this.parseWithIndex(groupeA[8], HEADERS.matieres, SHEETS.matieres, 'id_matiere') as MatiereConfig[];


    this.cache.setFamilles(familles);
    this.cache.setClasses(classes);
    this.cache.setFrais(frais);
    this.cache.setEnseignants(enseignants);
    this.cache.setMatieres(matieres);

    // Appel 2 : Groupe B + D — élèves + snapshots
    const groupeBD = await this.sheets.batchGet([
      `${SHEETS.eleves}!A:H`,
      `${SHEETS.soldesSnap}!A:H`,
    ]);

    const eleves = this.parseWithIndex(groupeBD[0], HEADERS.eleves, SHEETS.eleves, 'id_eleve') as Eleve[];
    const soldes = this.parseWithIndex(groupeBD[2], HEADERS.soldesSnap, SHEETS.soldesSnap, 'id_eleve') as SoldeSnap[];

    this.cache.setEleves(eleves);
    this.cache.setSoldes(soldes);

    // Appel 3 : Groupe C — notes (plus volumineux, cache 24h)
    const notesRaw = await this.sheets.batchGet([`${SHEETS.notes}!A:I`]);

    const notes = this.parseWithIndex(notesRaw[0], HEADERS.notes, SHEETS.notes, 'id_note') as Note[];
    this.cache.setNotes(notes);
  }


  // Matieres

  getMatieres(): MatiereConfig[] {
    return this.cache.getMatieres() ?? [];
  }

  // ─────────────────────────────────────────────────
  // FAMILLES
  // ─────────────────────────────────────────────────

  getFamilles(): Famille[] {
    return this.cache.getFamilles() ?? [];
  }

  async addFamille(f: Famille): Promise<void> {
    // 1. Cache local immédiat
    this.cache.upsertFamille(f);
    // 2. Calcul du futur rowIndex (taille actuelle + 2 car ligne 1 = en-tête)
    const nextRow = (this.getFamilles().length) + 1;
    this.setRowIndex(SHEETS.familles, f.id_famille, nextRow);
    // 3. Envoi en file
    const row = HEADERS.familles.map(k => (f as any)[k] ?? '');
    this.queue.enqueue({ sheetName: SHEETS.familles, rowData: row }, 'addRow');
  }

  async updateFamille(f: Famille): Promise<void> {
    // Récupère le rowIndex depuis la map — jamais besoin d'appel réseau
    const ri = this.getRowIndex(SHEETS.familles, f.id_famille);
    if (!ri) {
      console.warn(`rowIndex inconnu pour famille ${f.id_famille} — addRow utilisé`);
      return this.addFamille(f);
    }
    this.cache.upsertFamille(f);
    // Enfile un updateCell par colonne modifiée
    HEADERS.familles.forEach((key, colIdx) => {
      this.queue.enqueue({
        sheetName: SHEETS.familles,
        row: ri,
        col: colIdx + 1,
        value: (f as any)[key] ?? '',
      }, 'updateCell');
    });
  }

  async deleteFamille(id: string): Promise<void> {
    const ri = this.getRowIndex(SHEETS.familles, id);
    if (!ri) return;
    this.cache.removeFamille(id);
    this.queue.enqueue({ sheetName: SHEETS.familles, rowIndex: ri - 1 }, 'deleteRow');
    this.clearRowIndex(SHEETS.familles, id);
  }

  // ─────────────────────────────────────────────────
  // ÉLÈVES
  // ─────────────────────────────────────────────────

  getEleves(): Eleve[] {
    return this.cache.getEleves() ?? [];
  }

  getElevesEnrichis() {
    const fMap = this.cache.famillesMap();
    const cMap = this.cache.classesMap();
    return this.getEleves().map(e => ({
      ...e,
      famille: fMap.get(e.id_famille),
      classe: cMap.get(e.id_classe),
    }));
  }

  async addEleve(e: Eleve): Promise<void> {
    this.cache.upsertEleve(e);
    const nextRow = this.getEleves().length + 1;
    this.setRowIndex(SHEETS.eleves, e.id_eleve, nextRow);
    const row = HEADERS.eleves.map(k => (e as any)[k] ?? '');
    this.queue.enqueue({ sheetName: SHEETS.eleves, rowData: row }, 'addRow');
  }

  async updateEleve(e: Eleve): Promise<void> {
    const ri = this.getRowIndex(SHEETS.eleves, e.id_eleve);
    if (!ri) {
      console.warn(`rowIndex inconnu pour élève ${e.id_eleve} — addRow utilisé`);
      return this.addEleve(e);
    }
    this.cache.upsertEleve(e);
    HEADERS.eleves.forEach((key, colIdx) => {
      this.queue.enqueue({
        sheetName: SHEETS.eleves,
        row: ri,
        col: colIdx + 1,
        value: (e as any)[key] ?? '',
      }, 'updateCell');
    });
  }

  async deleteEleve(id: string): Promise<void> {
    const ri = this.getRowIndex(SHEETS.eleves, id);
    if (!ri) return;
    // Archivage logique : on change le statut à 'archive' au lieu de supprimer
    const eleve = this.getEleves().find(x => x.id_eleve === id);
    if (eleve) await this.updateEleve({ ...eleve, statut: 'archive' });
  }

  // ─────────────────────────────────────────────────
  // CLASSES
  // ─────────────────────────────────────────────────

  getClasses(): Classe[] {
    return this.cache.getClasses() ?? [];
  }

  async addClasse(c: Classe): Promise<void> {
    this.cache.upsertClasse(c);
    const nextRow = (this.cache.getClasses()?.length ?? 0) + 1;
    this.setRowIndex(SHEETS.classes, c.id_classe, nextRow);
    const row = HEADERS.classes.map(k => (c as any)[k] ?? '');
    this.queue.enqueue({ sheetName: SHEETS.classes, rowData: row }, 'addRow');
  }

  async updateClasse(c: Classe): Promise<void> {
    const ri = this.getRowIndex(SHEETS.classes, c.id_classe);
    if (!ri) return this.addClasse(c);
    this.cache.upsertClasse(c);
    HEADERS.classes.forEach((key, colIdx) => {
      this.queue.enqueue({
        sheetName: SHEETS.classes,
        row: ri, col: colIdx + 1,
        value: (c as any)[key] ?? '',
      }, 'updateCell');
    });
  }

  // ─────────────────────────────────────────────────
  // PAIEMENTS
  // ─────────────────────────────────────────────────

  async getPaiementsEleve(idEleve: string): Promise<Paiement[]> {
    const all = await this.readSheet<Paiement>(SHEETS.paiements, HEADERS.paiements);
    return all.filter(p => p.id_eleve === idEleve);
  }

  async addPaiement(p: Paiement): Promise<void> {
    // Patch solde local immédiat sans re-fetch
    this.patchSoldeLocal(p);
    const row = HEADERS.paiements.map(k => (p as any)[k] ?? '');
    this.queue.enqueue({ sheetName: SHEETS.paiements, rowData: row }, 'addRow');
  }

  private patchSoldeLocal(p: Paiement): void {
    const soldes = this.cache.getSoldes() ?? [];
    const idx = soldes.findIndex(s => s.id_eleve === p.id_eleve);
    if (idx === -1) return;
    const old = soldes[idx];
    const fraisConfig = (this.cache.getFrais() ?? []).find(f => {
      const classe = this.cache.classesMap().get(
        this.getEleves().find(e => e.id_eleve === p.id_eleve)?.id_classe ?? ''
      );
      return classe && f.id_classe === classe.id_classe;
    });
    const reste = Math.max(0, old.reste_a_payer - p.montant_verse);
    this.cache.upsertSolde({
      ...old,
      total_verse: old.total_verse + p.montant_verse,
      reste_a_payer: reste,
      statut_insolvable: reste > (fraisConfig?.seuil_insolvable ?? 0),
      dernier_paiement: p.date_paiement,
    });
  }

  // ─────────────────────────────────────────────────
  // NOTES
  // ─────────────────────────────────────────────────


  async saveNotesBatch(notes: Note[]): Promise<void> {
    notes.forEach(note => {
      const row = HEADERS.notes.map(k => (note as any)[k] ?? '');
      this.queue.enqueue({ sheetName: SHEETS.notes, rowData: row }, 'addRow');
    });
    this.cache.setNotesBatch(notes);
  }

  async deleteNotesBatch(noteIds: string[]): Promise<void> {
    noteIds.forEach(id => {
      const ri = this.getRowIndex(SHEETS.notes, id);
      if (ri) {
        this.queue.enqueue({ sheetName: SHEETS.notes, rowIndex: ri - 1 }, 'deleteRow');
        this.clearRowIndex(SHEETS.notes, id);
      }
    });
    this.cache.deleteNotesBatch(noteIds);
  }
  // ─────────────────────────────────────────────────
  // SNAPSHOTS — rechargés manuellement ou après regénération
  // ─────────────────────────────────────────────────

  async refreshSoldesSnap(): Promise<void> {
    const rows = await this.sheets.fetchRaw(SHEETS.soldesSnap);
    const data = this.parseWithIndex(rows, HEADERS.soldesSnap, SHEETS.soldesSnap, 'id_eleve') as SoldeSnap[];
    this.cache.setSoldes(data);
  }

  async refreshBulletinsSnap(): Promise<void> {
    const rows = await this.sheets.fetchRaw(SHEETS.bulletinsSnap);
    const data = this.parseWithIndex(rows, HEADERS.bulletinsSnap, SHEETS.bulletinsSnap, 'id_eleve') as BulletinSnap[];
    this.cache.setBulletins(data);
  }

  // ─────────────────────────────────────────────────
  // LECTURE PUBLIQUE (templates, logs, etc.)
  // ─────────────────────────────────────────────────

  async readSheetPublic<T>(sheetName: string): Promise<T[]> {
    const headersMap: Record<string, string[]> = {
      [SHEETS.msgTemplates]: HEADERS.msgTemplates,
      [SHEETS.logAlertes]: HEADERS.logAlertes,
    };
    const hdrs = headersMap[sheetName] ?? [];
    if (!hdrs.length) return [];
    return this.readSheet<T>(sheetName, hdrs);
  }

  // ─────────────────────────────────────────────────
  // GESTION DES rowIndex (dictionnaire en mémoire)
  // ─────────────────────────────────────────────────

  private setRowIndex(sheet: string, id: string, row: number): void {
    if (!this.rowIndex.has(sheet)) this.rowIndex.set(sheet, new Map());
    this.rowIndex.get(sheet)!.set(id, row);
  }

  private getRowIndex(sheet: string, id: string): number | undefined {
    return this.rowIndex.get(sheet)?.get(id);
  }

  private clearRowIndex(sheet: string, id: string): void {
    this.rowIndex.get(sheet)?.delete(id);
  }


  /** Lit une feuille et retourne un tableau d'objets typés */
  private async readSheet<T>(sheetName: string, headers: string[]): Promise<T[]> {
    const rows = await this.sheets.fetchRaw(sheetName);
    return this.parse(rows, headers) as T[];
  }

  /**
   * Parse + stocke les rowIndex en même temps
   * Ligne 2 de Sheets = index 2 (ligne 1 = en-tête)
   */
  private parseWithIndex(
    rows: any[][],
    headers: string[],
    sheetName: string,
    idKey: string
  ): Record<string, any>[] {
    if (!rows?.length) return [];
    return rows
      .filter((r, i) => r.length > 0 && r[0] !== '' && i !== 0)
      .map((row, i) => {
        const obj: Record<string, any> = {};
        headers.forEach((h, j) => { obj[h] = row[j] ?? ''; });
        // rowIndex Sheets = i + 2 (ligne 1 = en-tête, données commencent à 2)
        const id = obj[idKey];
        if (id) this.setRowIndex(sheetName, String(id), i + 2);
        return obj;
      });
  }

  /** Parse sans stocker rowIndex (pour lectures à la demande) */
  private parse(rows: any[][], headers: string[]): Record<string, any>[] {
    if (!rows?.length) return [];
    return rows
      .filter(r => r.length > 0 && r[0] !== '')
      .map(row => {
        const obj: Record<string, any> = {};
        headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
        return obj;
      });
  }

  private createSheets() {
    Object.entries(SHEETS).forEach(([key, sheetName]) => {
      this.sheets.createSheet({
        sheetName: sheetName,
        headers: HEADERS[key as keyof typeof HEADERS],
      });
    });
  }
}