// parent.service.ts — Authentification + données espace parent
// ─────────────────────────────────────────────────────────────
// Responsabilités :
//   - Login / logout par numéro de téléphone
//   - Chargement et cache local des données famille
//   - Rafraîchissement automatique toutes les 10 min
//   - Calculs enrichis (moyennes, pension, notifications)
//   - CRUD tables tampon (inscription, paiement initié)
import { Injectable, inject, signal, computed } from '@angular/core';

import { DashboardParent, PARENT_DATA_KEY, EleveParent, PaiementParent, NotifParent, SHEET_TAMPON, DemandePaiement } from '../models/parent.models';
import { GoogleSheetsService } from './@google-sheets/google-sheets.service';
import { SHEET, H, parse, DataServiceBase } from './@data';
import { Session } from '../models/auth/session.model';
import { SessionService } from './@session/session.service';
import { Absence, Eleve, Famille, Note, Sequence } from '../models';
import { RefreshServices } from './@data/_refresh.services';

// ─────────────────────────────────────────────────────────────


@Injectable({ providedIn: 'root' })
export class ParentService {

  readonly sheets = inject(GoogleSheetsService);
  private sessionService = inject(SessionService);
  private dataServiceBase = inject(DataServiceBase);
  private refresh = inject(RefreshServices);

  // ── State ────────────────────────────────────────────────────
  readonly erreur = signal<string | null>(null);
  readonly dashboard = signal<DashboardParent | null>(null);
  readonly chargement = signal(false);
  readonly famille = computed(() => this.dashboard()?.famille ?? null);
  readonly eleves = computed(() => this.dashboard()?.eleves ?? []);
  readonly paiement = computed(() => this.dashboard()?.paiement ?? null);
  readonly notifications = computed(() =>
    (this.dashboard()?.notifications ?? []).filter(n => !n.lue)
  );



  // ── Auth ─────────────────────────────────────────────────────

  async login(tel: string): Promise<'ok' | 'introuvable' | 'erreur' | 'non-actif'> {
    this.chargement.set(true);
    this.erreur.set(null);
    try {
      const raw = await this.sheets.fetchRaw(SHEET.familles);
      const familles = parse<Famille>(raw, H.familles);

      const clean = tel.replace(/\s+/g, '').replace(/^\+237/, '');
      const famille = familles.find(f =>
        f.tel_pere?.replace(/\s+/g, '').replace(/^\+237/, '') === clean ||
        f.tel_mere?.replace(/\s+/g, '').replace(/^\+237/, '') === clean
      );

      if (!famille) { this.chargement.set(false); return 'introuvable'; }
      if (famille.status !== 'ACTIF') { this.chargement.set(false); return 'non-actif'; }

      const session: Session = { id_famille: famille.id_famille, nom_famille: famille.nom_famille, tel: clean, expires_at: 0, };
      this.sessionService.creer(session);
      this.dataServiceBase.initAppData()
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
    this.dashboard.set(null);
    // this.sessionService.clear();
    localStorage.removeItem(PARENT_DATA_KEY);
  }

  // ── Chargement données ───────────────────────────────────────

  async rafraichir(): Promise<void> {
    await this.refresh.refreshAbsences()
    await this.refresh.refreshEleves()
    await this.refresh.refreshFamilles()
    await this.refresh.refreshPaiements()
    await this.refresh.refreshNotes()
    await this.refresh.refreshClasses()
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