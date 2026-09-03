// parent.service.ts — Authentification + données espace parent
// ─────────────────────────────────────────────────────────────
// Responsabilités :
//   - Login / logout par numéro de téléphone
//   - Lecture centralisée des données famille (dashboard = FamilleEnrichi)
//   - Rafraîchissement des données
//   - Marquage "lu" des notifications (overlay local, ne dépend pas de CacheService)
//   - Initiation de paiement (table tampon)
//
// ⚠️ Toute lecture de données pour l'espace parent doit passer par CE service
//    (famille, eleves, elevesEnrichis, moratoires, paiementsHistorique,
//    notificationsToutes). Les autres services ne font que du métier pur
//    sur les listes qu'il expose.

import { Injectable, inject, signal, computed } from '@angular/core';

import { DashboardParent, PARENT_DATA_KEY, SHEET_TAMPON, DemandePaiement } from '../models/parent.models';
import { GoogleSheetsService } from './@google-sheets/google-sheets.service';
import { SHEET, H, parse, DataServiceBase, GetServices } from './@data';
import { Session } from '../models/auth/session.model';
import { SessionService } from './@session/session.service';
import { Famille, FamilleEnrichi } from '../models';

@Injectable({ providedIn: 'root' })
export class ParentService {

  readonly sheets = inject(GoogleSheetsService);
  private sessionService = inject(SessionService);
  private dataServiceBase = inject(DataServiceBase);
  private get = inject(GetServices);

  // ── State ────────────────────────────────────────────────────
  readonly erreur = signal<string | null>(null);
  readonly chargement = signal(false);

  /**
   * dashboard() EST directement la FamilleEnrichi de la famille connectée
   * (FamilleEnrichi extends Famille — pas de sous-propriété `.famille`).
   */
  readonly dashboard = computed(() =>
    this.get.getFamilles().find(f => f.id_famille === this.sessionService.get()?.id_famille) ?? null
  );

  readonly famille = computed<FamilleEnrichi>(() => this.dashboard() ?? null);

  readonly eleves = computed(() => this.dashboard()?.eleves ?? []);

  /** Alias de eleves() : déjà enrichis (EleveEnrichi) dans FamilleEnrichi. */
  readonly elevesEnrichis = computed(() => this.dashboard()?.eleves ?? []);

  readonly moratoires = computed(() => this.dashboard()?.moratoires ?? []);

  readonly paiementsHistorique = computed(() => this.dashboard()?.paiements ?? []);

  // ── Notifications : overlay local pour le marquage "lu" ─────────
  // dashboard() est un computed en lecture seule (dérivé de GetServices) :
  // impossible d'y écrire directement. On garde donc localement les ids déjà
  // marqués comme lus, et on les fusionne à la volée avec la donnée source.
  private idsNotifsLues = signal<Set<string>>(new Set());

  readonly notificationsToutes = computed(() => {
    const notifs = this.dashboard()?.notifications ?? [];
    const lues = this.idsNotifsLues();
    if (lues.size === 0) return notifs;
    return notifs.map((n: { id: string; }) => (lues.has(n.id) ? { ...n, lue: true } : n));
  });

  /** Marque une notification comme lue (overlay local, silencieux). */
  marquerLue(id: string): void {
    this.idsNotifsLues.update(set => {
      if (set.has(id)) return set; // déjà marquée, pas de nouvelle référence inutile
      const next = new Set(set);
      next.add(id);
      return next;
    });
    // TODO: persister côté serveur si nécessaire — aucune méthode dédiée
    // connue actuellement (ni CacheService, ni PatchServices).
  }

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

      const session: Session = { id_famille: famille.id_famille, nom_famille: famille.nom_famille, tel: clean, expires_at: 0 };
      this.sessionService.creer(session);
      this.dataServiceBase.initAppData();
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
    localStorage.removeItem(PARENT_DATA_KEY);
    // TODO: sessionService.clear() si applicable — laissé tel quel (commenté dans la version d'origine).
  }

  // ── Chargement données ───────────────────────────────────────

  async rafraichir(): Promise<void> {
    await this.dataServiceBase.initAppData();
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
    } catch {
      return false;
    }
  }
}