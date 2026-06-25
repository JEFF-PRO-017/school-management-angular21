// data.service.ts
import { Injectable, inject } from '@angular/core';
import { CacheService } from './cache.service';
import { SheetsQueueServiceService } from './sheets-queue.service';
import { GoogleSheetsService } from './@google-sheets/google-sheets.service';
import {
  Famille, Eleve, Classe, FraisConfig, Enseignant,
  MatiereConfig, SoldeSnap, BulletinSnap, Paiement, Note,
  MsgTemplate, Absence, LogAlerte, AppUser, PermissionId
} from '../models';
import { FamilleTampon, SHEET_TAMPON, H_TAMPON, EleveTampon, PensionTampon, DemandePaiement } from '../models/parent.models';
import { AnneeScolaireFamille } from '../models/family';


// ── Helpers sérialisation permissions (tableau ↔ chaîne CSV) ──────
export function concatStrings(arr: PermissionId[] | string[]): string {
  return Array.isArray(arr) ? arr.join(',') : '';
}
export function deconcatString(s: string): PermissionId[] {
  return s ? (s.split(',').filter(Boolean) as PermissionId[]) : [];
}


// ── Constantes feuilles ───────────────────────────────────────────
export const SHEET = {
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
  absences: 'F13_ABSENCES',
  users: 'F14_USERS',
  anneesvc: 'F15_ANNEESVC',
} as const;

export const H = {
  familles: ['id_famille', 'nom_famille', 'tel_pere', 'tel_mere', 'tel_autre',
    'latitude', 'longitude', 'adresse_texte',
    'montant_total_attendu', 'annee_scolaire', 'montant_reduction', 'commentaire'],
  eleves: ['id_eleve', 'id_famille', 'id_classe', 'nom', 'prenom', 'date_naissance',
    'date_inscription', 'statut', 'lieu_naissance', 'sexe', 'matricule'],
  classes: ['id_classe', 'nom_classe', 'niveau', 'cycle', 'annee_scolaire',
    'effectif_max', 'enseignant_principal','prix'],
  paiements: ['id_paiement', 'id_famille', 'montant_verse', 'date_paiement', 'mode_paiement',
    'periode_concernee', 'date_prochain_rdv', 'recu_numero', 'notes_caissier',
    'statut_alerte_whatsapp'],
  frais: ['id_frais', 'id_famille', 'id_classe', 'type_frais', 'montant_total_attendu',
    'montant_reduction', 'seuil_insolvable', 'annee_scolaire', 'commentaire'],
  notes: ['id_note', 'id_eleve', 'id_classe', 'matiere', 'id_enseignant', 'sequence',
    'note_obtenue', 'note_sur', 'annee_scolaire'],
  enseignants: ['id_enseignant', 'nom', 'prenom', 'tel', 'email', 'classes_assignees'],
  matieres: ['id_matiere', 'nom_matiere', 'id_classe', 'coefficient', 'note_eliminatoire',
    'groupe', 'niveau', 'id_enseignant'],
  soldes: ['id_eleve', 'id_famille', 'total_verse', 'montant_attendu', 'reste_a_payer',
    'statut_insolvable', 'dernier_paiement', 'nb_enfants_famille'],
  bulletins: ['id_eleve', 'id_classe', 'sequence', 'moy_ponderee', 'rang', 'premier',
    'dernier', 'mention', 'moy_classe'],
  templates: ['id_template', 'type', 'objet', 'contenu', 'variables_dynamiques', 'actif',
    'langue', 'destinataire'],
  logs: ['id_log', 'id_eleve', 'id_famille', 'id_template', 'numero_dest',
    'date_envoi', 'statut', 'hash_dedup'],
  absences: ['id', 'id_enfant', 'id_famille', 'id_classe', 'date', 'heure', 'justifie', 'motif'],
  users: ['id', 'username', 'mot_de_passe', 'nom', 'role', 'is_admin', 'section', 'permissions'],
  anneesvc: ['id_annee_scolaire', 'id_famille', 'annee_scolaire', 'commentaire', 'montant_total_attendu', 'montant_reduction', 'montant_reduction_special', 'anciennete']
} as const;

@Injectable({ providedIn: 'root' })
export class DataService {

  private cache = inject(CacheService);
  private queue = inject(SheetsQueueServiceService);
  private sheets = inject(GoogleSheetsService);

  // ── Cache ──────────────────────────────────────────────────────

  invalidateCache(): void { this.cache.invalidateAll(); }

  // ── Démarrage ──────────────────────────────────────────────────

  async initAppData(): Promise<void> {
    await this.ensureSheets();

    // Groupe A — données statiques (batchGet)
    const [rawFam, rawCls, rawFrais, rawEns, rawMat, rawAnn] = await this.batchFetch([
      `${SHEET.familles}!A:L`,
      `${SHEET.classes}!A:H`,
      `${SHEET.frais}!A:I`,
      `${SHEET.enseignants}!A:F`,
      `${SHEET.matieres}!A:H`,
      `${SHEET.anneesvc}!A:H`,
    ]);
    this.cache.setFamilles(this.parse<Famille>(rawFam, H.familles));
    this.cache.setClasses(this.parse<Classe>(rawCls, H.classes));
    this.cache.setFrais(this.parse<FraisConfig>(rawFrais, H.frais));
    this.cache.setEnseignants(this.parse<Enseignant>(rawEns, H.enseignants));
    this.cache.setMatieres(this.parse<MatiereConfig>(rawMat, H.matieres));
    this.cache.setAnneeSvc(this.parse<AnneeScolaireFamille>(rawAnn, H.anneesvc))

    // Groupe B — élèves + soldes
    const [rawElv, rawSol] = await this.batchFetch([
      `${SHEET.eleves}!A:K`,
      `${SHEET.soldes}!A:H`,
    ]);
    this.cache.setEleves(this.parse<Eleve>(rawElv, H.eleves));
    this.cache.setSoldes(this.parse<SoldeSnap>(rawSol, H.soldes));

    // Groupe C — en arrière-plan (pas bloquant)
    this.sheets.fetchRaw(SHEET.notes).then(r =>
      this.cache.setNotes(this.parse<Note>(r, H.notes))
    );
    this.sheets.fetchRaw(SHEET.paiements).then(r =>
      this.cache.setPaiements(this.parse<Paiement>(r, H.paiements))
    );

    // Groupe D — meta
    await Promise.all([
      this.loadTemplates(),
      this.loadLogs(),
      this.loadUsers(),
    ]);
  }

  // ── Getters ────────────────────────────────────────────────────

  getClasses(): Classe[] { return this.cache.getClasses(); }
  getFamilles(): any[] { return this.cache.getFamilles(); }
  getEleves(): Eleve[] { return this.cache.getEleves(); }
  getMatieres(): MatiereConfig[] { return this.cache.getMatieres(); }
  getFrais(): FraisConfig[] { return this.cache.getFrais(); }
  getEnseignants(): Enseignant[] { return this.cache.getEnseignants(); }
  getSoldes(): SoldeSnap[] { return this.cache.getSoldes(); }
  getPaiements(): Paiement[] { return this.cache.getPaiements(); }

  // ── Refreshs individuels ───────────────────────────────────────
  // Utilisés par le header pour actualiser une seule feuille

  async refreshFamilles(): Promise<void> {
    const raw = await this.sheets.fetchRaw(SHEET.familles);
    this.cache.setFamilles(this.parse<Famille>(raw, H.familles));
  }

  async refreshEleves(): Promise<void> {
    const raw = await this.sheets.fetchRaw(SHEET.eleves);
    this.cache.setEleves(this.parse<Eleve>(raw, H.eleves));
  }

  async refreshClasses(): Promise<void> {
    const raw = await this.sheets.fetchRaw(SHEET.classes);
    this.cache.setClasses(this.parse<Classe>(raw, H.classes));
  }

  async refreshPaiements(): Promise<void> {
    const raw = await this.sheets.fetchRaw(SHEET.paiements);
    this.cache.setPaiements(this.parse<Paiement>(raw, H.paiements));
  }

  async refreshNotes(): Promise<void> {
    const raw = await this.sheets.fetchRaw(SHEET.notes);
    this.cache.setNotes(this.parse<Note>(raw, H.notes));
  }

  async refreshSoldes(): Promise<void> {
    const raw = await this.sheets.fetchRaw(SHEET.soldes);
    this.cache.setSoldes(this.parse<SoldeSnap>(raw, H.soldes));
  }

  async refreshBulletins(): Promise<void> {
    const raw = await this.sheets.fetchRaw(SHEET.bulletins);
    this.cache.setBulletins(this.parse<BulletinSnap>(raw, H.bulletins));
  }

  async refreshAbsences(): Promise<void> {
    const raw = await this.sheets.fetchRaw(SHEET.absences);
    this.cache.setAbsences(this.parse<Absence>(raw, H.absences));
  }

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
    if (row === -1) return this.addFamille(f);
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

  async addAnneeSvc(a: AnneeScolaireFamille) {
    this.cache.upsertAnneeSvc(a);
    this.queue.enqueue(
      { sheetName: SHEET.anneesvc, rowData: this.toRow(a, H.anneesvc) },
      'addRow'
    );
  }
  async updateAnneeSvc(a: AnneeScolaireFamille) {
    this.cache.upsertAnneeSvc(a);
    const row = await this.sheets.findRowById(SHEET.anneesvc, a.id_annee_scolaire);
    if (row === -1) return this.addAnneeSvc(a);
    this.queue.enqueue(
      { sheetName: SHEET.anneesvc, row, col: 1, values: this.toRow(a, H.anneesvc) },
      'updateRow'
    );
  }
  // ── Élèves ─────────────────────────────────────────────────────

  async addEleve(e: any): Promise<void> {
    this.cache.upsertEleve(e);
    this.queue.enqueue(
      { sheetName: SHEET.eleves, rowData: this.toRow(e, H.eleves) },
      'addRow'
    );
  }

  async updateEleve(e: any): Promise<void> {
    this.cache.upsertEleve(e);
    const row = await this.sheets.findRowById(SHEET.eleves, e.id_eleve);
    if (row === -1) return this.addEleve(e);
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

  async addClasse(c: any): Promise<void> {
    this.cache.upsertClasse(c);
    this.queue.enqueue(
      { sheetName: SHEET.classes, rowData: this.toRow(c, H.classes) },
      'addRow'
    );
  }

  async updateClasse(c: any): Promise<void> {
    this.cache.upsertClasse(c);
    const row = await this.sheets.findRowById(SHEET.classes, c.id_classe);
    if (row === -1) return this.addClasse(c);
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

  // ── Frais ──────────────────────────────────────────────────────

  async addFrais(f: FraisConfig): Promise<void> {
    this.queue.enqueue(
      { sheetName: SHEET.frais, rowData: this.toRow(f, H.frais) },
      'addRow'
    );
  }

  async updateFrais(f: FraisConfig): Promise<void> {
    const row = await this.sheets.findRowById(SHEET.frais, f.id_frais);
    if (row === -1) return this.addFrais(f);
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

  // ── Absences ──────────────────────────────────────────────────

  async getAbsences(): Promise<Absence[]> {
    const cached = this.cache.getAbsences();
    if (cached.length) return cached;
    const raw = await this.sheets.fetchRaw(SHEET.absences);
    const abs = this.parse<Absence>(raw, H.absences);
    this.cache.setAbsences(abs);
    return abs;
  }

  async addAbsencesBatch(absences: Absence[]): Promise<void> {
    this.cache.addAbsencesBatch(absences);
    absences.forEach(a => this.queue.enqueue(
      { sheetName: SHEET.absences, rowData: this.toRow(a, H.absences) },
      'addRow'
    ));
  }

  // ── Templates ─────────────────────────────────────────────────

  async loadTemplates(): Promise<void> {
    const raw = await this.sheets.fetchRaw(SHEET.templates);
    this.cache.setTemplates(this.parse<MsgTemplate>(raw, H.templates));
  }

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
      if (row === -1) return this.addTemplate(t);
      this.queue.enqueue(
        { sheetName: SHEET.templates, row, col: 1, values: this.toRow(t, H.templates) },
        'updateRow'
      );
    });
  }

  // ── Logs ──────────────────────────────────────────────────────

  async loadLogs(): Promise<void> {
    const raw = await this.sheets.fetchRaw(SHEET.logs);
    this.cache.setLogs(this.parse<LogAlerte>(raw, H.logs));
  }

  getLogs(): LogAlerte[] {
    return this.cache.getLogs();
  }

  addLog(l: LogAlerte): void {
    this.cache.upsertLog(l);
    this.queue.enqueue(
      { sheetName: SHEET.logs, rowData: this.toRow(l, H.logs) },
      'addRow'
    );
  }

  // ── Utilisateurs ─────────────────────────────────────────────

  async loadUsers(): Promise<void> {
    const raw = await this.sheets.fetchRaw(SHEET.users);
    this.cache.setUsers(
      this.parse<AppUser>(raw, H.users).map(u => ({
        ...u,
        is_admin: String(u.is_admin) === 'OUI' || u.is_admin === true,
        permissions: deconcatString(
          typeof u.permissions === 'string' ? u.permissions : ''
        ),
      }))
    );
  }

  getUsers(): AppUser[] {
    return this.cache.getUsers();
  }

  addUser(u: AppUser): void {
    this.cache.upsertUser(u);
    this.queue.enqueue(
      {
        sheetName: SHEET.users,
        rowData: this.toRow(
          { ...u, permissions: concatStrings(u.permissions), is_admin: u.is_admin ? 'OUI' : 'NON' },
          H.users
        ),
      },
      'addRow'
    );
  }

  updateUser(u: AppUser): void {
    this.cache.upsertUser(u);
    this.sheets.findRowById(SHEET.users, u.id).then(row => {
      if (row === -1) return this.addUser(u);
      this.queue.enqueue(
        {
          sheetName: SHEET.users,
          row,
          col: 1,
          values: this.toRow(
            { ...u, permissions: concatStrings(u.permissions), is_admin: u.is_admin ? 'OUI' : 'NON' },
            H.users
          ),
        },
        'updateRow'
      );
    });
  }

  deleteUser(id: string): void {
    this.cache.removeUser(id);
    this.sheets.findRowById(SHEET.users, id).then(row => {
      if (row === -1) return;
      this.queue.enqueue({ sheetName: SHEET.users, rowIndex: row - 1 }, 'deleteRow');
    });
  }

  // ── Snapshots ─────────────────────────────────────────────────

  async readSheetPublic<T>(sheetName: string): Promise<T[]> {
    const map: Partial<Record<string, readonly string[]>> = {
      [SHEET.templates]: H.templates,
      [SHEET.logs]: H.logs,
    };
    const headers = map[sheetName];
    if (!headers) {
      console.warn(`readSheetPublic : feuille inconnue "${sheetName}"`);
      return [];
    }
    return this.parse<T>(await this.sheets.fetchRaw(sheetName), headers);
  }

  // ── Tables tampon (espace parent) ─────────────────────────────
  // Lecture, écriture et validation des données en attente

  /** Charge toutes les familles tampon */
  async getFamillesTampon(): Promise<FamilleTampon[]> {
    const raw = await this.sheets.fetchRaw(SHEET_TAMPON.familles);
    return this.parse<FamilleTampon>(raw, H_TAMPON.familles);
  }

  /** Charge tous les élèves tampon */
  async getElevesTampon(): Promise<EleveTampon[]> {
    const raw = await this.sheets.fetchRaw(SHEET_TAMPON.eleves);
    return this.parse<EleveTampon>(raw, H_TAMPON.eleves);
  }

  /** Charge toutes les pensions tampon */
  async getPensionsTampon(): Promise<PensionTampon[]> {
    const raw = await this.sheets.fetchRaw(SHEET_TAMPON.pensions);
    return this.parse<PensionTampon>(raw, H_TAMPON.pensions);
  }

  /** Charge toutes les demandes de paiement initiées */
  async getDemandePaiements(): Promise<DemandePaiement[]> {
    const raw = await this.sheets.fetchRaw(SHEET_TAMPON.paiements);
    return this.parse<DemandePaiement>(raw, H_TAMPON.paiements);
  }

  /** Ajoute une famille en tampon */
  addFamilleTampon(f: FamilleTampon): void {
    this.queue.enqueue(
      { sheetName: SHEET_TAMPON.familles, rowData: this.toRow(f, H_TAMPON.familles) },
      'addRow'
    );
  }

  /** Ajoute un élève en tampon */
  addEleveTampon(e: EleveTampon): void {
    this.queue.enqueue(
      { sheetName: SHEET_TAMPON.eleves, rowData: this.toRow(e, H_TAMPON.eleves) },
      'addRow'
    );
  }

  /** Ajoute une pension en tampon */
  addPensionTampon(p: PensionTampon): void {
    this.queue.enqueue(
      { sheetName: SHEET_TAMPON.pensions, rowData: this.toRow(p, H_TAMPON.pensions) },
      'addRow'
    );
  }

  /** Enregistre une demande de paiement initiée par le parent */
  addDemandePaiement(d: DemandePaiement): void {
    this.queue.enqueue(
      { sheetName: SHEET_TAMPON.paiements, rowData: this.toRow(d, H_TAMPON.paiements) },
      'addRow'
    );
  }

  /**
   * Valide une famille tampon :
   *   1. Insère dans les tables principales (famille + élèves)
   *   2. Met à jour le statut dans le tampon
   */
  async validerFamilleTampon(
    famille: FamilleTampon,
    eleves: EleveTampon[],
    pension: PensionTampon | null
  ): Promise<void> {
    // Insertion famille principale
    await this.addFamille({
      id_famille: famille.id_famille,
      nom_famille: famille.nom_famille,
      tel_pere: famille.tel_pere,
      tel_mere: famille.tel_mere,
      tel_autre: famille.tel_autre,
      adresse_texte: famille.adresse_texte,
      annee_scolaire: pension?.annee_scolaire ?? '',
      montant_total_attendu: pension?.montant_total_attendu ?? 0,
      montant_reduction: pension?.montant_reduction ?? 0,
      commentaire: pension?.commentaire ?? '',
    });

    // Insertion élèves principaux
    for (const e of eleves) {
      await this.addEleve({
        id_eleve: e.id_eleve,
        id_famille: famille.id_famille,
        id_classe: e.id_classe ?? '',
        nom: e.nom,
        prenom: e.prenom,
        date_naissance: e.date_naissance ?? '',
        sexe: e.sexe ?? undefined,
        statut: 'actif',
        matricule: '',
      });
    }

    // Mise à jour statut tampon → 'valide'
    const rowFam = await this.sheets.findRowById(SHEET_TAMPON.familles, famille.id_famille);
    if (rowFam !== -1) {
      this.queue.enqueue(
        {
          sheetName: SHEET_TAMPON.familles,
          row: rowFam,
          col: 1,
          values: this.toRow(
            { ...famille, statut_validation: 'valide' },
            H_TAMPON.familles
          ),
        },
        'updateRow'
      );
    }
  }

  /**
   * Refuse une famille tampon (met à jour le statut)
   */
  async refuserFamilleTampon(idFamille: string): Promise<void> {
    const row = await this.sheets.findRowById(SHEET_TAMPON.familles, idFamille);
    if (row === -1) return;
    const familles = await this.getFamillesTampon();
    const f = familles.find(x => x.id_famille === idFamille);
    if (!f) return;
    this.queue.enqueue(
      {
        sheetName: SHEET_TAMPON.familles,
        row,
        col: 1,
        values: this.toRow({ ...f, statut_validation: 'refuse' }, H_TAMPON.familles),
      },
      'updateRow'
    );
  }

  /**
   * Valide une demande de paiement :
   * Crée un vrai Paiement dans F4_PAIEMENTS et met à jour le statut tampon
   */
  async validerDemandePaiement(d: DemandePaiement): Promise<void> {
    await this.addPaiement({
      id_paiement: `PAI-${Date.now()}`,
      id_famille: d.id_famille,
      montant_verse: d.montant,
      date_paiement: new Date().toISOString().slice(0, 10),
      mode_paiement: d.mode_paiement as any,
      periode_concernee: '',
      date_prochain_rdv: '',
      recu_numero: d.reference ?? '',
      notes_caissier: d.commentaire ?? '',
      statut_alerte_whatsapp: 'EN_ATTENTE',
    });

    const row = await this.sheets.findRowById(SHEET_TAMPON.paiements, d.id);
    if (row !== -1) {
      this.queue.enqueue(
        {
          sheetName: SHEET_TAMPON.paiements,
          row,
          col: 1,
          values: this.toRow({ ...d, statut: 'valide' }, H_TAMPON.paiements),
        },
        'updateRow'
      );
    }
  }

  // ── Helpers privés ─────────────────────────────────────────────

  private toRow(obj: any, headers: readonly string[]): any[] {
    return headers.map(k => obj[k] ?? '');
  }

  private parse<T>(rows: any[][], headers: readonly string[]): T[] {
    if (!rows?.length) return [];
    return rows.slice(1)
      .filter(r => r.length && r[0])
      .map(row => {
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

  public async ensureSheets(): Promise<void> {
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

  async addMatiere(m: MatiereConfig): Promise<void> {
    this.cache.upsertMatiere(m);
    this.queue.enqueue(
      { sheetName: SHEET.matieres, rowData: this.toRow(m, H.matieres) },
      'addRow'
    );
  }

  async updateMatiere(m: MatiereConfig): Promise<void> {
    this.cache.upsertMatiere(m);
    const row = await this.sheets.findRowById(SHEET.matieres, m.id_matiere);
    if (row === -1) return this.addMatiere(m);
    this.queue.enqueue(
      { sheetName: SHEET.matieres, row, col: 1, values: this.toRow(m, H.matieres) },
      'updateRow'
    );
  }
}