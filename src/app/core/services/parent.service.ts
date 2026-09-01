// parent.service.ts — Authentification + données espace parent
// ─────────────────────────────────────────────────────────────
// Responsabilités :
//   - Login / logout par numéro de téléphone
//   - Chargement et cache local des données famille
//   - Rafraîchissement automatique toutes les 10 min
//   - Calculs enrichis (moyennes, pension, notifications)
//   - CRUD tables tampon (inscription, paiement initié)
import { Injectable, inject, signal, computed } from '@angular/core';

import { Eleve, Paiement, Absence, Note, Sequence, SEQUENCES } from '../models/last_index';
import { DashboardParent, PARENT_DATA_KEY, EleveParent, PaiementParent, NotifParent, SHEET_TAMPON, DemandePaiement, REFRESH_INTERVAL_MS, H_TAMPON } from '../models/parent.models';
import { GoogleSheetsService } from './@google-sheets/google-sheets.service';
import { SHEET, H } from './@data';
import { Session } from '../models/auth/session.model';
import { SessionService } from './@session/session.service';
import { Famille } from '../models';

// ─────────────────────────────────────────────────────────────


@Injectable({ providedIn: 'root' })
export class ParentService {

  // Exposé public pour que les composants enfants puissent
  // appeler les méthodes tampon directement si besoin
  readonly sheets = inject(GoogleSheetsService);
  private sessionService = inject(SessionService);

  // ── State ────────────────────────────────────────────────────

  readonly session = signal<Session | null>(this.chargerSession());
  readonly dashboard = signal<DashboardParent | null>(this.chargerCache());
  readonly chargement = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly estConnecte = computed(() => this.session() !== null);
  readonly famille = computed(() => this.dashboard()?.famille ?? null);
  readonly eleves = computed(() => this.dashboard()?.eleves ?? []);
  readonly paiement = computed(() => this.dashboard()?.paiement ?? null);
  readonly notifications = computed(() =>
    (this.dashboard()?.notifications ?? []).filter(n => !n.lue)
  );
  readonly nbNotifNonLues = computed(() => this.notifications().length);
  readonly isInsolvable = computed(() => {
    const p = this.paiement();
    return !!p && p.rdv_depasse && p.reste_a_payer > 0;
  });

  private _refreshTimer: ReturnType<typeof setInterval> | null = null;

  // ── Auth ─────────────────────────────────────────────────────

  async login(tel: string): Promise<'ok' | 'introuvable' | 'erreur' | 'non-actif'> {
    this.chargement.set(true);
    this.erreur.set(null);
    try {
      const raw = await this.sheets.fetchRaw(SHEET.familles);
      const familles = this.parse<Famille>(raw, H.familles);

      const clean = tel.replace(/\s+/g, '').replace(/^\+237/, '');
      const famille = familles.find(f =>
        f.tel_pere?.replace(/\s+/g, '').replace(/^\+237/, '') === clean ||
        f.tel_mere?.replace(/\s+/g, '').replace(/^\+237/, '') === clean
      );

      if (!famille) { this.chargement.set(false); return 'introuvable'; }
      if (famille.status === 'NON-ACTIF') { this.chargement.set(false); return 'non-actif'; }

      const session: Session = { id_famille: famille.id_famille, nom_famille: famille.nom_famille, tel: clean, expires_at: 0, };
      this.session.set(session);
      this.sessionService.creer(session);

      await this.chargerDonnees(famille.id_famille);
      this.demarrerRefresh();
      return 'ok';
    } catch (e) {
      console.error('login parent:', e);
      this.erreur.set('Erreur de connexion. Vérifiez votre réseau.');
      return 'erreur';
    } finally {
      this.chargement.set(false);
    }
  }

  logout(): void {
    this.session.set(null);
    this.dashboard.set(null);
    this.sessionService.clear();
    localStorage.removeItem(PARENT_DATA_KEY);
    this.arreterRefresh();
  }

  // ── Chargement données ───────────────────────────────────────

  async rafraichir(): Promise<void> {
    const s = this.session();
    if (!s) return;
    await this.chargerDonnees(s?.id_famille ?? '');
  }

  private async chargerDonnees(idFamille: string): Promise<void> {
    this.chargement.set(true);
    this.erreur.set(null);
    try {
      const [rawFam, rawElv, rawCls, rawPai, rawNotes, rawAbs] = await Promise.all([
        this.sheets.fetchRaw(SHEET.familles),
        this.sheets.fetchRaw(SHEET.eleves),
        this.sheets.fetchRaw(SHEET.classes),
        this.sheets.fetchRaw(SHEET.paiements),
        this.sheets.fetchRaw(SHEET.notes),
        this.sheets.fetchRaw(SHEET.absences),
      ]);

      const familles = this.parse<Famille>(rawFam, H.familles);
      const elevesRaw = this.parse<Eleve>(rawElv, H.eleves);
      const classes = this.parse<any>(rawCls, H.classes);
      const paiements = this.parse<Paiement>(rawPai, H.paiements);
      const notes = this.parse<Note>(rawNotes, H.notes);
      const absences = this.parse<Absence>(rawAbs, H.absences);

      const famille = familles.find(f => f.id_famille === idFamille);
      if (!famille) { this.erreur.set('Famille introuvable.'); return; }

      const mesEleves = elevesRaw.filter(e => e.id_famille === idFamille && e.statut === 'actif');
      const mesPaiements = paiements.filter(p => p.id_famille === idFamille);
      const mesAbsences = absences.filter(a => a.id_famille === idFamille);

      // ── Calcul effectifs par classe ──
      const effectifMap = new Map<string, number>();
      classes.forEach((c: any) =>
        effectifMap.set(c.id_classe, elevesRaw.filter(e => e.id_classe === c.id_classe && e.statut === 'actif').length)
      );

      // ── Rang par classe ──
      const moyMap = new Map<string, number[]>(); // id_classe → moyennes triées desc
      mesEleves.forEach(eleve => {
        const cls = classes.find((c: any) => c.id_classe === eleve.id_classe);
        if (!cls) return;
        const elsCls = elevesRaw.filter(e => e.id_classe === eleve.id_classe && e.statut === 'actif');
        const moys = elsCls.map(e => this.calcMoyTrim(e, notes, cls)).filter((m): m is number => m !== null).sort((a, b) => b - a);
        moyMap.set(eleve.id_classe, moys);
      });

      // ── Enrichissement élèves ──
      const elevesEnrichis: EleveParent[] = mesEleves.map(eleve => {
        const cls = classes.find((c: any) => c.id_classe === eleve.id_classe);
        const seqs: Sequence[] = SEQUENCES;
        const moyennes = seqs.map(seq => ({
          sequence: seq,
          moyenne: this.calcMoySeq(eleve, seq, notes, cls),
        })).filter(m => m.moyenne !== null);

        const moyTrim = this.calcMoyTrim(eleve, notes, cls);
        const clsMoys = moyMap.get(eleve.id_classe) ?? [];
        const rang = moyTrim !== null ? clsMoys.indexOf(moyTrim) + 1 : null;
        const absEleve = mesAbsences.filter(a => a.id_enfant === eleve.id_eleve);

        return {
          id_eleve: eleve.id_eleve,
          nom: eleve.nom,
          prenom: eleve.prenom,
          id_classe: eleve.id_classe,
          nom_classe: cls?.nom_classe ?? '—',
          niveau: cls?.niveau ?? '—',
          statut: eleve.statut,
          moyennes,
          moy_trimestrielle: moyTrim,
          rang,
          effectif_classe: effectifMap.get(eleve.id_classe) ?? 0,
          absences_count: absEleve.length,
          absences_non_justifiees: absEleve.filter(a => !a.justifie).length,
          derniere_absence: absEleve.sort((a, b) => b.date.localeCompare(a.date))[0]?.date ?? null,
        };
      });

      // ── Paiement ──
      const attendu = 0
      const paye = mesPaiements.reduce((s, p) => s + +(p.montant_verse ?? 0), 0);
      const reste = Math.max(0, attendu - paye);
      const rdvs = mesPaiements.map(p => p.date_prochain_rdv).filter(Boolean) as string[];
      const dernierRdv = rdvs.sort().at(-1) ?? null;
      const rdvDepasse = !!dernierRdv && dernierRdv < new Date().toISOString().slice(0, 10) && reste > 0;

      const paiement: PaiementParent = {
        montant_attendu: attendu,
        montant_paye: paye,
        reste_a_payer: reste,
        taux_paiement: attendu > 0 ? Math.min(100, Math.round((paye / attendu) * 100)) : 0,
        dernier_paiement: mesPaiements.sort((a, b) => b.date_paiement.localeCompare(a.date_paiement))[0]?.date_paiement ?? null,
        prochain_rdv: dernierRdv,
        rdv_depasse: rdvDepasse,
        historique: mesPaiements.sort((a, b) => b.date_paiement.localeCompare(a.date_paiement)),
      };

      // ── Notifications ──
      const notifs = this.genererNotifications(elevesEnrichis, paiement, mesAbsences);

      const dash: DashboardParent = {
        famille: { ...famille, eleves: mesEleves, paiements: mesPaiements },
        eleves: elevesEnrichis,
        paiement,
        notifications: notifs,
      };

      this.dashboard.set(dash);
      localStorage.setItem(PARENT_DATA_KEY, JSON.stringify({ dash, ts: Date.now() }));
    } catch (e) {
      console.error('chargerDonnees:', e);
      this.erreur.set('Erreur lors du chargement. Données en cache affichées.');
    } finally {
      this.chargement.set(false);
    }
  }

  // ── Notifications générées localement ────────────────────────

  private genererNotifications(
    eleves: EleveParent[],
    paiement: PaiementParent,
    absences: Absence[]
  ): NotifParent[] {
    const notifs: NotifParent[] = [];
    const today = new Date().toISOString().slice(0, 10);

    // Retard de paiement
    if (paiement.rdv_depasse) {
      notifs.push({
        id: 'rdv-depasse', type: 'paiement', lue: false, urgente: true,
        titre: 'Rendez-vous de paiement dépassé',
        corps: `Restant : ${this.fcfa(paiement.reste_a_payer)} FCFA. Prenez contact avec l'administration.`,
        date: today,
      });
    }

    // Absences récentes (7 derniers jours)
    const semaine = new Date(); semaine.setDate(semaine.getDate() - 7);
    const absRecentes = absences.filter(a => a.date >= semaine.toISOString().slice(0, 10));
    if (absRecentes.length > 0) {
      notifs.push({
        id: `abs-${today}`, type: 'absence', lue: false, urgente: absRecentes.length >= 3,
        titre: `${absRecentes.length} absence(s) cette semaine`,
        corps: 'Consultez le détail dans la section Absences.',
        date: today,
      });
    }

    // Nouvelles notes disponibles
    const avecNotes = eleves.filter(e => e.moyennes.length > 0);
    if (avecNotes.length > 0) {
      notifs.push({
        id: 'notes-dispo', type: 'note', lue: false, urgente: false,
        titre: 'Résultats disponibles',
        corps: `Notes disponibles pour ${avecNotes.length} enfant(s).`,
        date: today,
      });
    }

    return notifs;
  }

  marquerLue(id: string): void {
    const dash = this.dashboard();
    if (!dash) return;
    this.dashboard.set({
      ...dash,
      notifications: dash.notifications.map(n => n.id === id ? { ...n, lue: true } : n),
    });
  }

  // ── Tables tampon ────────────────────────────────────────────


  async initierPaiement(demande: Omit<DemandePaiement, 'id' | 'date_demande' | 'statut'>): Promise<boolean> {
    try {
      await this.sheets.addRow({
        sheetName: SHEET_TAMPON.paiements,
        rowData: [
          `PAI-${Date.now()}`, demande.id_famille,
          demande.montant, demande.mode_paiement,
          demande.reference ?? '', demande.commentaire ?? '',
          new Date().toISOString(), 'en_attente',
        ],
      });
      return true;
    } catch { return false; }
  }

  // ── Refresh auto ─────────────────────────────────────────────

  demarrerRefresh(): void {
    this.arreterRefresh();
    this._refreshTimer = setInterval(() => this.rafraichir(), REFRESH_INTERVAL_MS);
  }

  arreterRefresh(): void {
    if (this._refreshTimer) { clearInterval(this._refreshTimer); this._refreshTimer = null; }
  }

  // ── Helpers privés ───────────────────────────────────────────

  private chargerSession(): Session | null {
    try {
      const s = this.sessionService.get();
      if (!s) return null;
      return s.expires_at > Date.now() ? s : null;
    } catch { return null; }
  }

  private chargerCache(): DashboardParent | null {
    try {
      const raw = localStorage.getItem(PARENT_DATA_KEY);
      if (!raw) return null;
      const { dash } = JSON.parse(raw);
      return dash ?? null;
    } catch { return null; }
  }

  private parse<T>(rows: any[][], headers: readonly string[]): T[] {
    if (!rows?.length) return [];
    return rows.slice(1).filter(r => r.length && r[0]).map(row => {
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
      return obj as T;
    });
  }

  private calcMoySeq(eleve: Eleve, seq: Sequence, notes: Note[], cls: any): number | null {
    if (!cls?.matieres?.length) return null;
    const notesEleve = notes.filter(n => n.id_eleve === eleve.id_eleve && n.sequence === seq);
    let pts = 0, coeff = 0, has = false;
    (cls.matieres ?? []).forEach((m: any) => {
      const c = +(m.coefficient ?? 1);
      const n = notesEleve.find(n => n.matiere === m.nom_matiere);
      if (n?.note_obtenue) { pts += +(n.note_obtenue) * c; has = true; }
      coeff += c;
    });
    return has && coeff > 0 ? pts / coeff : null;
  }

  private calcMoyTrim(eleve: Eleve, notes: Note[], cls: any): number | null {
    const seqs: Sequence[] = ['SEQ1', 'SEQ2', 'SEQ3'];
    const moys = seqs.map(s => this.calcMoySeq(eleve, s, notes, cls)).filter((m): m is number => m !== null);
    return moys.length ? moys.reduce((a, b) => a + b, 0) / moys.length : null;
  }

  private fcfa(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(n));
  }
}