// cache.service.ts — objet db synchrone en mémoire + sauvegarde IndexedDB en arrière-plan
import { Injectable, signal, computed } from '@angular/core';

import { DemandePaiement, EleveTampon, FamilleTampon, PensionTampon } from '../models/parent.models';
import { AnneeScolaireFamille, Famille, Moratoire } from '../models/family';
import { AppUser, AppUserEnrichi, PointageResult, Absence, Paiement, PaiementEnrichi, Note, Classe, Eleve, Enseignant, FraisConfig, LogAlerte, MatiereConfig, MsgTemplate, Sequence, SEQUENCES } from '../models';
import { loadDb, saveTables, wipeStorage } from './db.storage';
import { Db, emptyDb, TableName } from '../../../../db.model';
import { SoldeSnap, BulletinSnap } from '../models/last_index';

@Injectable({ providedIn: 'root' })
export class CacheService {

  // ══════════════════════════════════════════════════════════════
  //  SOURCE DE VÉRITÉ : un seul objet db, synchrone, en mémoire
  // ══════════════════════════════════════════════════════════════
  private _db = signal<Db>(emptyDb());

  // ── Tranches (chaque computed ne change que si SA table change) ─
  private _familles = computed(() => this._db().familles);
  private _classes = computed(() => this._db().classes);
  private _frais = computed(() => this._db().frais);
  private _enseignants = computed(() => this._db().enseignants);
  private _matieres = computed(() => this._db().matieres);
  private _notes = computed(() => this._db().notes);
  private _paiements = computed(() => this._db().paiements);
  private _eleves = computed(() => this._db().eleves);
  private _soldes = computed(() => this._db().soldes);
  private _bulletins = computed(() => this._db().bulletins);
  private _absences = computed(() => this._db().absences);
  private _templates = computed(() => this._db().templates);
  private _logs = computed(() => this._db().logs);
  private _anneeSvc = computed(() => this._db().anneeSvc);
  private _moratoire = computed(() => this._db().moratoires);

  // ── Tampons (espace parent — données en attente) ──────────────
  private _famillesTampon = computed(() => this._db().famillesTampon);
  private _elevesTampon = computed(() => this._db().elevesTampon);
  private _pensionsTampon = computed(() => this._db().pensionsTampon);
  private _demandesPaiement = computed(() => this._db().demandesPaiement);

  // ── Non persistés (sensibles ou éphémères) ────────────────────
  private _users = signal<AppUser[]>([]);
  private _pointages = signal<PointageResult[]>([]);

  // ── Section active — injectée depuis AuthService via setSection() ─
  private _section = signal<'primaire' | 'secondaire' | 'all'>('all');

  // ══════════════════════════════════════════════════════════════
  //  PERSISTANCE (asynchrone, invisible pour le reste de l'app)
  // ══════════════════════════════════════════════════════════════
  private dirty = new Set<TableName>();
  private flushTimer: any;

  constructor() {
    // Si l'onglet se ferme avant la fin du délai, on sauvegarde tout de suite
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => { this.flush(); });
    }
  }

  /** Point d'entrée UNIQUE pour modifier une table (synchrone) */
  private write<K extends TableName>(table: K, fn: (l: Db[K]) => Db[K]): void {
    this._db.update(db => ({ ...db, [table]: fn(db[table]) }) as Db);
    this.markDirty(table);
  }

  private markDirty(table: TableName) {
    this.dirty.add(table);
    clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => this.flush(), 300); // regroupe les écritures
  }

  private async flush() {
    clearTimeout(this.flushTimer);
    const tables = [...this.dirty];
    this.dirty.clear();
    if (!tables.length) return;
    try {
      await saveTables(this._db(), tables);
    } catch (e) {
      console.warn('Sauvegarde IndexedDB échouée', e);
    }
  }

  /** À appeler au démarrage (APP_INITIALIZER) : IndexedDB → _db */
  async hydrate(): Promise<void> {
    try {
      const saved = await loadDb();
      this._db.update(db => ({ ...db, ...saved }));
    } catch (e) {
      console.warn('Lecture IndexedDB impossible', e);
    }
  }

  /** Vide la mémoire seulement (IndexedDB intact) */
  clearMemory(): void {
    clearTimeout(this.flushTimer);
    this.dirty.clear();
    this._db.set(emptyDb());
    this._users.set([]);
    this._pointages.set([]);
  }

  /** Vide la mémoire ET IndexedDB (à utiliser à la déconnexion) */
  async invalidateAll(): Promise<void> {
    this.clearMemory();          // annule aussi toute sauvegarde en attente
    await wipeStorage();
  }

  // ══════════════════════════════════════════════════════════════
  //  INDEX ET COMPUTED D'ENRICHISSEMENT (inchangés)
  // ══════════════════════════════════════════════════════════════

  // ── Niveau 1 : index notes pour O(1) ──────────────────────────
  // Clé : "id_eleve|sequence|id_classe"
  private _notesIndex = computed(() => {
    const idx = new Map<string, Note[]>();
    for (const n of this._notes()) {
      const k = `${n.id_eleve}|${n.sequence}|${n.id_classe}`;
      const arr = idx.get(k);
      if (arr) arr.push(n); else idx.set(k, [n]);
    }
    return idx;
  });

  // Niveau 1 : index paiements par famille pour O(1)
  private _paiementsParFamille = computed(() => {
    const idx = new Map<string, Paiement[]>();
    for (const p of this._paiements()) {
      const arr = idx.get(p.id_famille);
      if (arr) arr.push(p); else idx.set(p.id_famille, [p]);
    }
    return idx;
  });

  // ── Niveau 2 : élèves enrichis ────────────────────────────────
  private _elevesEnrichis = computed<any[]>(() => {
    const famMap = new Map(this._familles().map(f => [f.id_famille, f]));
    const absMap = this._absences();
    const notesIdx = this._notesIndex();
    const classe = this._classes();
    return this._eleves().map(e => ({
      ...e,
      classe: classe.find(c => c.id_classe === e.id_classe),
      famille: famMap.get(e.id_famille),
      absences: absMap.filter(a => a.id_eleve === e.id_eleve),
      sequences: SEQUENCES.map((seq: Sequence) => ({
        sequence: seq,
        notes_eleve: notesIdx.get(`${e.id_eleve}|${seq}|${e.id_classe}`) ?? [],
      })),
    }));
  });

  private _anneeSvcEnrichies = computed<AnneeScolaireFamille[]>(() => {
    const moratoires = this._moratoire();
    return this._anneeSvc().map(a => ({
      ...a,
      moratoires: moratoires.filter(m => m.id_annee_scolaire === a.id_annee_scolaire)
    }));
  });

  // ── Niveau 3 : familles enrichies ─────────────────────────────
  // On crée un NOUVEL objet pour chaque famille, on ne mute jamais
  private _famillesEnrichies = computed<Famille[] | any[]>(() => {
    const anneeSvc = this._anneeSvcEnrichies();
    const elevesEnrichis = this._elevesEnrichis();
    const paiementsParFam = this._paiementsParFamille();

    return this._familles().map(f => ({
      ...f,
      eleves: elevesEnrichis.filter(e => e.id_famille === f.id_famille),
      paiements: paiementsParFam.get(f.id_famille) ?? [],
      annee_scolaires: anneeSvc.filter(a => a.id_famille === f.id_famille)
    }));
  });

  // ── Niveau 3 : matières enrichies ─────────────────────────────
  private _matieresEnrichies = computed<MatiereConfig[]>(() => {
    const ensMap = new Map(this._enseignants().map(e => [e.id_enseignant, e]));
    const clsMap = new Map(this._classes().map(c => [c.id_classe, c]));
    return this._matieres().map(m => ({
      ...m,
      enseignant: ensMap.get(m.id_enseignant) as any,
      classe: clsMap.get(m.id_classe) as any,
    }));
  });

  // ── Niveau 4 : classes enrichies ──────────────────────────────
  private _classesEnrichies = computed<Classe[]>(() => {
    const mats = this._matieresEnrichies();
    const elevs = this._elevesEnrichis();
    const section = this._section();   // gardé pour le filtre par section

    return this._classes()
      // .filter(c => section === 'all' || c.cycle === section)
      .map(c => ({
        ...c,
        eleves: elevs.filter(e => e.id_classe === c.id_classe),
        matieres: mats.filter(m => m.id_classe === c.id_classe),
      }));
  });

  private _usersEnrichies = computed<AppUserEnrichi[] | any[]>(() => {
    const mats = this._matieresEnrichies();
    const cls = this._classesEnrichies();

    return this._users().map(u => ({
      ...u,
      classes_assignees_infos: cls.find(c => c.enseignant_principal === u.id),
      matieres: mats.filter(m => m.id_enseignant === u.id)
    }));
  });

  private _paiementEnrichies = computed<PaiementEnrichi[] | any[]>(() => {
    const fas = this._familles();
    return this._paiements().map(p => ({
      ...p,
      famille: fas.find(f => f.id_famille === p.id_famille)
    }));
  });

  // ── Maps O(1) publiques ───────────────────────────────────────
  readonly famillesMap = computed(() =>
    new Map(this._famillesEnrichies().map(f => [f.id_famille, f]))
  );
  readonly classesMap = computed(() =>
    new Map(this._classesEnrichies().map(c => [c.id_classe, c]))
  );
  readonly matieresMap = computed(() =>
    new Map(this._matieresEnrichies().map(m => [m.id_matiere, m]))
  );

  // ══════════════════════════════════════════════════════════════
  //  GETTERS PUBLICS (inchangés)
  // ══════════════════════════════════════════════════════════════
  getFamilles(): any[] { return this._famillesEnrichies(); }
  getClasses(): Classe[] { return this._classesEnrichies(); }
  getEleves(): Eleve[] { return this._elevesEnrichis(); }
  getMatieres(): MatiereConfig[] { return this._matieresEnrichies(); }
  getFrais(): FraisConfig[] { return this._frais(); }
  getEnseignants(): Enseignant[] { return this._enseignants(); }
  getSoldes(): SoldeSnap[] { return this._soldes(); }
  getBulletins(): BulletinSnap[] { return this._bulletins(); }
  getNotes(): Note[] { return this._notes(); }
  getPaiements(): PaiementEnrichi[] { return this._paiementEnrichies(); }

  // ══════════════════════════════════════════════════════════════
  //  SETTERS
  // ══════════════════════════════════════════════════════════════
  setFamilles(d: Famille[]) { this.write('familles', () => d ); }
  setClasses(d: Classe[] | any[]) { this.write('classes', () => d as Classe[]); }
  setFrais(d: FraisConfig[]) { this.write('frais', () => d); }
  setEnseignants(d: Enseignant[]) { this.write('enseignants', () => d); }
  setMatieres(d: MatiereConfig[] | any[]) { this.write('matieres', () => d as MatiereConfig[]); }
  setEleves(d: Eleve[] | any[]) { this.write('eleves', () => d as Eleve[]); }
  setSoldes(d: SoldeSnap[]) { this.write('soldes', () => d); }
  setBulletins(d: BulletinSnap[]) { this.write('bulletins', () => d); }
  setNotes(d: Note[]) { this.write('notes', () => d); }
  setPaiements(d: Paiement[]) { this.write('paiements', () => d); }
  setAnneeSvc(a: AnneeScolaireFamille[]) { this.write('anneeSvc', () => a); }
  setMoratoires(m: Moratoire[]) { this.write('moratoires', () => m); }
  setPointages(p: PointageResult[]) { this._pointages.set(p); }   // non persisté

  // ══════════════════════════════════════════════════════════════
  //  UPSERT / REMOVE
  // ══════════════════════════════════════════════════════════════
  upsertFamille(f: Famille) { this.write('familles', l => upsert(l, f, 'id_famille')); }
  removeFamille(id: string) { this.write('familles', l => l.filter(x => x.id_famille !== id)); }
  removePaiement(id: string) { this.write('paiements', l => l.filter(x => x.id_paiement !== id)); }

  upsertEleve(e: Eleve) { this.write('eleves', l => upsert(l, e, 'id_eleve')); }
  removeEleve(id: string) { this.write('eleves', l => l.filter(x => x.id_eleve !== id)); }

  upsertClasse(c: Classe) { this.write('classes', l => upsert(l, c, 'id_classe')); }
  upsertPaiement(p: Paiement) { this.write('paiements', l => upsert(l, p, 'id_paiement')); }
  upsertSolde(s: SoldeSnap) { this.write('soldes', l => upsert(l, s, 'id_eleve')); }
  upsertMatiere(m: MatiereConfig) { this.write('matieres', l => upsert(l, m, 'id_matiere')); }
  upsertAnneeSvc(a: AnneeScolaireFamille) { this.write('anneeSvc', l => upsert(l, a, 'id_annee_scolaire')); }
  upsertMoratoire(m: Moratoire) { this.write('moratoires', l => upsert(l, m, 'id_moratoire')); }

  // ── Absences ──────────────────────────────────────────────────
  getAbsences(): Absence[] { return this._absences(); }
  setAbsences(d: Absence[]) { this.write('absences', () => d); }
  addAbsence(a: Absence) { this.write('absences', l => [a, ...l]); }
  addAbsencesBatch(abs: Absence[]) { this.write('absences', l => [...abs, ...l]); }
  addPointage(p: PointageResult) { this._pointages.update(l => [p, ...l]); }   // non persisté

  // ── Templates ─────────────────────────────────────────────────
  getTemplates(): MsgTemplate[] { return this._templates(); }
  setTemplates(d: MsgTemplate[]) { this.write('templates', () => d); }
  upsertTemplate(t: MsgTemplate) { this.write('templates', l => upsert(l, t, 'id_template')); }

  // ── Logs alertes ──────────────────────────────────────────────
  getLogs(): LogAlerte[] { return this._logs(); }
  setLogs(d: LogAlerte[]) { this.write('logs', () => d); }
  upsertLog(l: LogAlerte) { this.write('logs', list => upsert(list, l, 'id_log')); }

  // ── Utilisateurs (mémoire seulement) ──────────────────────────
  getUsers(): AppUser[] { return this._usersEnrichies(); }
  setUsers(d: AppUser[]) { this._users.set(d); }
  upsertUser(u: AppUser) { this._users.update(l => upsert(l, u, 'id')); }
  removeUser(id: string) { this._users.update(l => l.filter(u => u.id !== id)); }

  // ── Familles tampon ───────────────────────────────────────────
  getFamillesTampon(): FamilleTampon[] { return this._famillesTampon(); }
  setFamillesTampon(d: FamilleTampon[]) { this.write('famillesTampon', () => d ); }
  upsertFamilleTampon(f: FamilleTampon) {
    this.write('famillesTampon', l => upsert(l, f, 'id_famille'));
  }
  removeFamilleTampon(id: string) {
    this.write('famillesTampon', l => l.filter(f => f.id_famille !== id));
  }

  // ── Élèves tampon ─────────────────────────────────────────────
  getElevesTampon() { return this._elevesTampon(); }
  setElevesTampon(d: EleveTampon[]) { this.write('elevesTampon', () => d); }
  upsertEleveTampon(e: EleveTampon) {
    this.write('elevesTampon', l => upsert(l, e, 'id_eleve'));
  }
  removeElevesTamponFamille(idFamille: string) {
    this.write('elevesTampon', l => l.filter(e => e.id_famille !== idFamille));
  }

  // ── Pensions tampon ───────────────────────────────────────────
  getPensionsTampon(): PensionTampon[] { return this._pensionsTampon(); }
  setPensionsTampon(d: PensionTampon[]) { this.write('pensionsTampon', () => d); }
  upsertPensionTampon(p: PensionTampon) {
    this.write('pensionsTampon', l => upsert(l, p, 'id'));
  }

  // ── Demandes paiement ─────────────────────────────────────────
  getDemandesPaiement(): DemandePaiement[] { return this._demandesPaiement(); }
  setDemandesPaiement(d: DemandePaiement[]) { this.write('demandesPaiement', () => d); }
  upsertDemandePaiement(d: DemandePaiement) {
    this.write('demandesPaiement', l => upsert(l, d, 'id'));
  }
  removeDemandePaiement(id: string) {
    this.write('demandesPaiement', l => l.filter(d => d.id !== id));
  }

  // ── Computed consultant — vue enrichie (jointure en mémoire) ──
  readonly famillesTamponEnrichies = computed(() => {
    const fams = this._famillesTampon();
    const elevs = this._elevesTampon();
    const pens = this._pensionsTampon();
    return fams.map(f => ({
      ...f,
      eleves: elevs.filter(e =>
        e.id_famille === f.id_famille || (e as any).id_famille_tampon === f.id_famille
      ),
      pension: pens.find(p => p.id_famille === f.id_famille) ?? null,
    }));
  });

  // ── Section ───────────────────────────────────────────────────
  setSection(s: 'primaire' | 'secondaire' | 'all') { this._section.set(s); }

  // ── Notes en lot ──────────────────────────────────────────────
  setNotesBatch(notes: Note[]): void {
    this.write('notes', list => {
      const map = new Map(list.map(n => [n.id_note, n]));
      notes.forEach(n => map.set(n.id_note, n));
      return Array.from(map.values());
    });
  }

  deleteNotesBatch(ids: string[]): void {
    const set = new Set(ids);
    this.write('notes', list => list.filter(n => !set.has(n.id_note)));
  }
}

// Helper générique — hors classe, fonction pure
function upsert<T>(list: T[], item: T, key: keyof T): T[] {
  const idx = list.findIndex(x => x[key] === (item as any)[key]);
  return idx === -1 ? [...list, item] : list.map((x, i) => i === idx ? item : x);
}