// cache.service.ts — store central en mémoire avec TTL par groupe
// Groupe A (référentiels) : TTL 24h
// Groupe B (élèves)       : TTL session (invalidé manuellement)
// Groupe C (transactions) : jamais mis en cache global
import { Injectable, signal, computed, effect, untracked } from '@angular/core';
import {
  Famille, Eleve, Classe, FraisConfig,
  Enseignant, MatiereConfig, SoldeSnap, BulletinSnap,
  Note,
  Sequence,
  SEQUENCES
} from '../models';

/** Entrée de cache avec horodatage */
interface CacheEntry<T> {
  data: T;
  loadedAt: number;  // timestamp ms
}

const TTL_24H = 24 * 60 * 60 * 1000;
const TTL_SESSION = Infinity;  // invalidation manuelle uniquement

@Injectable({ providedIn: 'root' })
export class CacheService {

  private initCache: CacheEntry<any> = {
    data: null,
    loadedAt: 0
  };

  constructor() {
    effect(() => this.enrichirElevesAvecNotes());
    effect(() => this.enrichirClassesAvecEleves());
    effect(() => this.enrichirClassesAvecMatiere());
    effect(() => this.enrichirMatieresAvecEnseignant());
  }

  // ── Groupe A : Référentiels ─────────────────────
  private _familles = signal<CacheEntry<Famille[]> | null>(this.initCache);
  private _classes = signal<CacheEntry<Classe[]> | null>(this.initCache);
  private _frais = signal<CacheEntry<FraisConfig[]> | null>(this.initCache);
  private _enseignants = signal<CacheEntry<Enseignant[]> | null>(this.initCache);
  private _matieres = signal<CacheEntry<MatiereConfig[]> | null>(this.initCache);
  private _notes = signal<CacheEntry<Note[]> | null>(this.initCache);


  // Quand les notes changent → enrichir les élèves avec leurs notes
  private enrichirElevesAvecNotes(): void {
    const notes = this._notes();
    const eleves = untracked(() => this._eleves());

    if (!notes?.data || !eleves?.data) return;

    untracked(() => this.setEleves(
      eleves.data.map(e => ({
        ...e,
        sequences: SEQUENCES.map(seq => ({
          sequence: seq,
          notes_eleve: this.findNotesByEleveBySequence(e.id_eleve, seq, e.id_classe, notes.data)
        }))
      }))
    ));
  }

  // Quand les élèves changent → enrichir les classes avec leurs élèves
  private enrichirClassesAvecEleves(): void {
    const eleves = this._eleves();
    const classes = untracked(() => this._classes());

    if (!eleves?.data || !classes?.data) return;

    untracked(() => this.setClasses(
      classes.data.map(c => ({
        ...c,
        eleves: this.findElevesByClasse(c.id_classe, eleves.data)
      }))
    ));
  }
  // Quand les matières changent → enrichir les classes avec leurs matières
  private enrichirClassesAvecMatiere(): void {
    const matieres = this._matieres();
    const classes = untracked(() => this._classes());

    if (!matieres?.data || !classes?.data) return;
    untracked(() => this.setClasses(
      classes.data.map(c => ({
        ...c,
        matieres: matieres.data.filter(m => m.id_classe === c.id_classe)
      }))
    ));
  }

  //Quand les enseignants changent → enrichir les matières avec leurs enseignants
  private enrichirMatieresAvecEnseignant(): void {
    const enseignants = this._enseignants();
    const matieres = untracked(() => this._matieres());
    
    if (!enseignants?.data || !matieres?.data) return;  
    untracked(() => this.setMatieres(
      matieres.data.map(m => ({
        ...m,
        enseignant: enseignants.data.find(e => e.id_enseignant === m.id_enseignant)
      }))
    ));
  }
  
  private findElevesByClasse(classeId: string, eleves: Eleve[]): Eleve[] {
    return eleves.filter(e => e.id_classe === classeId);
  }

  private findNotesByEleveBySequence(id_eleve: string, sequence: Sequence, id_classe: string, notes: Note[]): Note[] {
    return notes.filter(n => n.id_eleve === id_eleve && n.sequence === sequence && n.id_classe === id_classe);
  }

  // ── Groupe B : Élèves (cache session) ───────────
  private _eleves = signal<CacheEntry<Eleve[]> | null>(this.initCache);

  // ── Groupe D : Snapshots ─────────────────────────
  private _soldes = signal<CacheEntry<SoldeSnap[]> | null>(this.initCache);
  private _bulletins = signal<CacheEntry<BulletinSnap[]> | null>(this.initCache);

  // ── Maps calculées pour jointures O(1) ──────────
  readonly famillesMap = computed(() => {
    const entry = this._familles();
    return entry ? new Map(entry.data.map(f => [f.id_famille, f])) : new Map<string, Famille>();
  });

  readonly classesMap = computed(() => {
    const entry = this._classes();
    return entry ? new Map(entry.data.map(c => [c.id_classe, c])) : new Map<string, Classe>();
  });

  readonly matieresMap = computed(() => {
    const entry = this._matieres();
    return entry ? new Map(entry.data.map(m => [m.id_matiere, m])) : new Map<string, MatiereConfig>();
  });

  // ── Getters avec vérification TTL ───────────────

  getFamilles(): Famille[] | null {
    return this.get(this._familles(), TTL_24H);
  }
  getClasses(): Classe[] | null {
    return this.get(this._classes(), TTL_24H);
  }
  getFrais(): FraisConfig[] | null {
    return this.get(this._frais(), TTL_24H);
  }
  getEnseignants(): Enseignant[] | null {
    return this.get(this._enseignants(), TTL_24H);
  }
  getMatieres(): MatiereConfig[] | null {
    return this.get(this._matieres(), TTL_24H);
  }
  getEleves(): Eleve[] | null {
    return this.get(this._eleves(), TTL_SESSION);
  }
  getSoldes(): SoldeSnap[] | null {
    return this.get(this._soldes(), TTL_SESSION);
  }
  getBulletins(): BulletinSnap[] | null {
    return this.get(this._bulletins(), TTL_SESSION);
  }
  getNotes(): Note[] | null {
    return this.get(this._notes(), TTL_24H);
  }

  // ── Setters (appelés après chaque fetch API) ────

  setFamilles(data: Famille[]) { this._familles.set(this.wrap(data)); }
  setClasses(data: Classe[]) { this._classes.set(this.wrap(data)); }
  setFrais(data: FraisConfig[]) { this._frais.set(this.wrap(data)); }
  setEnseignants(data: Enseignant[]) { this._enseignants.set(this.wrap(data)); }
  setMatieres(data: MatiereConfig[]) { this._matieres.set(this.wrap(data)); }
  setEleves(data: Eleve[]) { this._eleves.set(this.wrap(data)); }
  setSoldes(data: SoldeSnap[]) { this._soldes.set(this.wrap(data)); }
  setBulletins(data: BulletinSnap[]) { this._bulletins.set(this.wrap(data)); }
  setNotes(data: Note[]) { this._notes.set(this.wrap(data)); }
  // ── Mises à jour locales (patch sans re-fetch) ──

  /** Ajoute ou remplace une famille dans le cache local */
  upsertFamille(f: Famille): void {
    this.upsert(this._familles, f, 'id_famille');
  }
  upsertEleve(e: Eleve): void {
    this.upsert(this._eleves, e, 'id_eleve');
  }
  upsertClasse(c: Classe): void {
    this.upsert(this._classes, c, 'id_classe');
  }
  upsertSolde(s: SoldeSnap): void {
    this.upsert(this._soldes, s, 'id_eleve');
  }

  setNotesBatch(notes: Note[]): void {
    const existing = untracked(() => this._notes());
    if (!existing) return;
    const byId = new Map(existing.data.map(n => [n.id_note, n]));
    notes.forEach(n => byId.set(n.id_note, n));
    this.setNotes(Array.from(byId.values()));
  }

  deleteNotesBatch(noteIds: string[]): void {
    const existing = untracked(() => this._notes());
    if (!existing) return;
    const byId = new Map(existing.data.map(n => [n.id_note, n]));
    noteIds.forEach(id => byId.delete(id));
    this.setNotes(Array.from(byId.values()));
  }

  /** Supprime un élément du cache par id */
  removeFamille(id: string): void {
    this.remove(this._familles, 'id_famille', id);
  }
  removeEleve(id: string): void {
    this.remove(this._eleves, 'id_eleve', id);
  }

  // ── Invalidations ───────────────────────────────

  invalidateEleves() { this._eleves.set(null); }
  invalidateSoldes() { this._soldes.set(null); }
  invalidateBulletins() { this._bulletins.set(null); }
  invalidateAll() {
    this._familles.set(null); this._classes.set(null);
    this._frais.set(null); this._enseignants.set(null);
    this._matieres.set(null); this._eleves.set(null);
    this._soldes.set(null); this._bulletins.set(null);
  }

  // ── Helpers privés ───────────────────────────────

  private wrap<T>(data: T): CacheEntry<T> {
    return { data, loadedAt: Date.now() };
  }

  private get<T>(entry: CacheEntry<T> | null, ttl: number): T | null {
    if (!entry) return null;
    if (Date.now() - entry.loadedAt > ttl) return null;
    return entry.data;
  }

  /** Upsert générique sur un signal de tableau */
  private upsert<T>(
    sig: ReturnType<typeof signal<CacheEntry<T[]> | null>>,
    item: T,
    key: keyof T
  ): void {
    const entry = sig();
    if (!entry) return;
    const list = entry.data;
    const idx = list.findIndex(x => x[key] === (item as any)[key]);
    const next = idx === -1 ? [...list, item] : list.map((x, i) => i === idx ? item : x);
    sig.set(this.wrap(next));
  }

  private remove<T>(
    sig: ReturnType<typeof signal<CacheEntry<T[]> | null>>,
    key: keyof T,
    id: string
  ): void {
    const entry = sig();
    if (!entry) return;
    sig.set(this.wrap(entry.data.filter(x => (x as any)[key] !== id)));
  }
}
