// cache.service.ts — modèle Famille unifié (frais intégrés)
import { Injectable, signal, computed } from '@angular/core';
import {
  Famille, Eleve, Classe, FraisConfig, Enseignant,
  MatiereConfig, SoldeSnap, BulletinSnap,
  Note, Sequence, SEQUENCES, Paiement, Absence,
  MsgTemplate, LogAlerte, AppUser, PermissionId
} from '../models';

@Injectable({ providedIn: 'root' })
export class CacheService {

  // ── Signaux bruts ──────────────────────────────────────────────
  private _familles    = signal<Famille[]>([]);
  private _classes     = signal<Classe[]>([]);
  private _frais       = signal<FraisConfig[]>([]);
  private _enseignants = signal<Enseignant[]>([]);
  private _matieres    = signal<MatiereConfig[]>([]);
  private _notes       = signal<Note[]>([]);
  private _paiements   = signal<Paiement[]>([]);
  private _eleves      = signal<Eleve[]>([]);
  private _soldes      = signal<SoldeSnap[]>([]);
  private _bulletins   = signal<BulletinSnap[]>([]);
  private _absences    = signal<Absence[]>([]);
  private _templates   = signal<MsgTemplate[]>([]);
  private _logs        = signal<LogAlerte[]>([]);
  private _users       = signal<AppUser[]>([]);

  // ── Section active — injectée depuis AuthService via setSection() ─
  // Permet de filtrer les classes par section sans passer par le composant
  private _section     = signal<'primaire' | 'secondaire' | 'all'>('all');

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
  // Clé : id_famille → Paiement[]
  // On construit cet index UNE SEULE FOIS et les niveaux suivants s'en servent
  private _paiementsParFamille = computed(() => {
    const idx = new Map<string, Paiement[]>();
    for (const p of this._paiements()) {
      const arr = idx.get(p.id_famille);
      if (arr) arr.push(p); else idx.set(p.id_famille, [p]);
    }
    return idx;
  });

  // ── Niveau 2 : élèves enrichis ────────────────────────────────
  private _elevesEnrichis = computed<Eleve[]>(() => {
    const famMap   = new Map(this._familles().map(f => [f.id_famille, f]));
    const notesIdx = this._notesIndex();
    return this._eleves().map(e => ({
      ...e,
      famille:   famMap.get(e.id_famille),
      sequences: SEQUENCES.map((seq: Sequence) => ({
        sequence:    seq,
        notes_eleve: notesIdx.get(`${e.id_eleve}|${seq}|${e.id_classe}`) ?? [],
      })),
    }));
  });

  // ── Niveau 3 : familles enrichies ─────────────────────────────
  // Lit : _familles (brut) + _elevesEnrichis (N2) + _paiementsParFamille (N1)
  //
  // RÈGLE RESPECTÉE : on crée un NOUVEL objet avec { ...f } pour chaque famille
  // On ne mute jamais un objet existant dans un computed()
  private _famillesEnrichies = computed<Famille[]>(() => {
    const elevesEnrichis    = this._elevesEnrichis();   // N2
    const paiementsParFam   = this._paiementsParFamille(); // N1

    return this._familles().map(f => ({
      ...f,                                               // copie tous les champs bruts
      eleves:    elevesEnrichis.filter(e => e.id_famille === f.id_famille),
      paiements: paiementsParFam.get(f.id_famille) ?? [], // ← enrichissement paiements
    }));
  });

  // ── Niveau 3 : matières enrichies ─────────────────────────────
  private _matieresEnrichies = computed<MatiereConfig[]>(() => {
    const ensMap = new Map(this._enseignants().map(e => [e.id_enseignant, e]));
    const clsMap = new Map(this._classes().map(c => [c.id_classe, c]));
    return this._matieres().map(m => ({
      ...m,
      enseignant: ensMap.get(m.id_enseignant),
      classe:     clsMap.get(m.id_classe),
    }));
  });

  // ── Niveau 4 : classes enrichies, filtrées par section active ──
  // _section est mis à jour par AuthService.setSection() via header
  // getClasses() retourne uniquement les classes de la section visible
  private _classesEnrichies = computed<Classe[]>(() => {
    const mats    = this._matieresEnrichies();
    const elevs   = this._elevesEnrichis();
    const section = this._section();

    return this._classes()
      .filter(c => section === 'all' || c.cycle === section)
      .map(c => ({
        ...c,
        eleves:   elevs.filter(e => e.id_classe === c.id_classe),
        matieres: mats.filter(m => m.id_classe === c.id_classe),
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

  // ── Getters publics ────────────────────────────────────────────
  getFamilles():    Famille[]        { return this._famillesEnrichies(); }
  getClasses():     Classe[]         { return this._classesEnrichies(); }
  getEleves():      Eleve[]          { return this._elevesEnrichis(); }
  getMatieres():    MatiereConfig[]  { return this._matieresEnrichies(); }
  getFrais():       FraisConfig[]    { return this._frais(); }
  getEnseignants(): Enseignant[]     { return this._enseignants(); }
  getSoldes():      SoldeSnap[]      { return this._soldes(); }
  getBulletins():   BulletinSnap[]   { return this._bulletins(); }
  getNotes():       Note[]           { return this._notes(); }
  getPaiements():   Paiement[]       { return this._paiements(); }

  // ── Setters ───────────────────────────────────────────────────
  setFamilles(d: Famille[])         { this._familles.set(d); }
  setClasses(d: Classe[])           { this._classes.set(d); }
  setFrais(d: FraisConfig[])        { this._frais.set(d); }
  setEnseignants(d: Enseignant[])   { this._enseignants.set(d); }
  setMatieres(d: MatiereConfig[])   { this._matieres.set(d); }
  setEleves(d: Eleve[])             { this._eleves.set(d); }
  setSoldes(d: SoldeSnap[])         { this._soldes.set(d); }
  setBulletins(d: BulletinSnap[])   { this._bulletins.set(d); }
  setNotes(d: Note[])               { this._notes.set(d); }
  setPaiements(d: Paiement[])       { this._paiements.set(d); }

  // ── Upsert / remove ───────────────────────────────────────────
  upsertFamille(f: Famille)   { this._familles.update(l => upsert(l, f, 'id_famille')); }
  removeFamille(id: string)   { this._familles.update(l => l.filter(x => x.id_famille !== id)); }

  upsertEleve(e: Eleve)       { this._eleves.update(l => upsert(l, e, 'id_eleve')); }
  removeEleve(id: string)     { this._eleves.update(l => l.filter(x => x.id_eleve !== id)); }

  upsertClasse(c: Classe)     { this._classes.update(l => upsert(l, c, 'id_classe')); }

  upsertPaiement(p: Paiement) { this._paiements.update(l => upsert(l, p, 'id_paiement')); }

  upsertSolde(s: SoldeSnap)   { this._soldes.update(l => upsert(l, s, 'id_eleve')); }

  // ── Absences ──────────────────────────────────────────────────────
  getAbsences():       Absence[]  { return this._absences(); }
  setAbsences(d: Absence[])       { this._absences.set(d); }
  addAbsence(a: Absence)          { this._absences.update(l => [a, ...l]); }
  addAbsencesBatch(abs: Absence[]){ this._absences.update(l => [...abs, ...l]); }

  // ── Templates ─────────────────────────────────────────────────────
  getTemplates():            MsgTemplate[]  { return this._templates(); }
  setTemplates(d: MsgTemplate[])            { this._templates.set(d); }
  upsertTemplate(t: MsgTemplate)            {
    this._templates.update(l => upsert(l, t, 'id_template'));
  }

  // ── Logs alertes ──────────────────────────────────────────────────
  getLogs():                 LogAlerte[]    { return this._logs(); }
  setLogs(d: LogAlerte[])                   { this._logs.set(d); }
  upsertLog(l: LogAlerte)                   {
    this._logs.update(list => upsert(list, l, 'id_log'));
  }

  // ── Utilisateurs ──────────────────────────────────────────────────
  getUsers():                AppUser[]      { return this._users(); }
  setUsers(d: AppUser[])                    { this._users.set(d); }
  upsertUser(u: AppUser)                    {
    this._users.update(l => upsert(l, u, 'id'));
  }
  removeUser(id: string)                    {
    this._users.update(l => l.filter(u => u.id !== id));
  }

  // ── Section — permet de filtrer _classesEnrichies ─────────────────
  setSection(s: 'primaire' | 'secondaire' | 'all') { this._section.set(s); }

  setNotesBatch(notes: Note[]): void {
    this._notes.update(list => {
      const map = new Map(list.map(n => [n.id_note, n]));
      notes.forEach(n => map.set(n.id_note, n));
      return Array.from(map.values());
    });
  }

  deleteNotesBatch(ids: string[]): void {
    const set = new Set(ids);
    this._notes.update(list => list.filter(n => !set.has(n.id_note)));
  }

  // ── Invalidation complète ─────────────────────────────────────
  invalidateAll(): void {
    this._familles.set([]);    this._classes.set([]);
    this._frais.set([]);       this._enseignants.set([]);
    this._matieres.set([]);    this._eleves.set([]);
    this._soldes.set([]);      this._bulletins.set([]);
    this._notes.set([]);       this._paiements.set([]);
    this._absences.set([]);    this._templates.set([]);
    this._logs.set([]);        this._users.set([]);
  }
}

// Helper générique — hors classe, fonction pure
function upsert<T>(list: T[], item: T, key: keyof T): T[] {
  const idx = list.findIndex(x => x[key] === (item as any)[key]);
  return idx === -1 ? [...list, item] : list.map((x, i) => i === idx ? item : x);
}