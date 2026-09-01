// session.service.ts
// Centralise la création, la lecture et le renouvellement de la session
import { Injectable } from '@angular/core';
import { Session } from '../../models/auth/session.model';

const CLE_SESSION = 'session';
const DUREE_SESSION_MS = 30 * 60 * 1000;        // durée totale : 30 minutes
const SEUIL_RENOUVELLEMENT_MS = 5 * 60 * 1000;   // renouvelle si moins de 5 min restantes

@Injectable({ providedIn: 'root' })
export class SessionService {

  // Crée une nouvelle session avec une expiration à +30 min à partir de maintenant
  creer(donnees: Omit<Session, 'expires_at'>): void {
    const session: Session = {
      ...donnees,
      expires_at: Date.now() + DUREE_SESSION_MS,
    };
    this.set(session);
  }

  // Récupère la session stockée, ou null si absente/corrompue
  get(): Session | null {
    const brut = localStorage.getItem(CLE_SESSION);
    if (!brut) return null;
    try {
      return JSON.parse(brut) as Session;
    } catch {
      return null;
    }
  }

  private set(session: Session): void {
    localStorage.setItem(CLE_SESSION, JSON.stringify(session));
  }

  clear(): void {
    localStorage.removeItem(CLE_SESSION);
  }

  // Vérifie si une session existe et n'est pas expirée
  isValid(): boolean {
    const session = this.get();
    return !!session && session.expires_at > Date.now();
  }

  // Vrai si la session est valide mais qu'il reste moins de 5 min avant expiration
  doitEtreRenouvelee(): boolean {
    const session = this.get();
    if (!session) return false;
    const tempsRestant = session?.expires_at - Date.now();
    return tempsRestant > 0 && tempsRestant <= SEUIL_RENOUVELLEMENT_MS;
  }

  // Prolonge la session courante de 30 min supplémentaires (garde les mêmes données)
  renouveler(): void {
    const session = this.get();
    if (!session) return;
    session.expires_at = Date.now() + DUREE_SESSION_MS;
    this.set(session);
  }

  // Détermine la route de login selon le type de session (admin ou parent)
  getLoginRoute(session: Session | null): string[] {
    if (session?.id_user) return ['/admin/login'];
    if (session?.id_famille) return ['/espace-parent/login'];
    return ['/espace-parent/login'];
  }
}