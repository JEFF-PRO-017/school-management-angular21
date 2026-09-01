// session.service.ts
// Centralise la lecture/écriture de la session et la logique de redirection
import { Injectable } from '@angular/core';
import { Session } from '../../models/auth/session.model';

const CLE_SESSION = 'session';

@Injectable({ providedIn: 'root' })
export class SessionService {

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

  // Enregistre une nouvelle session
  set(session: Session): void {
    localStorage.setItem(CLE_SESSION, JSON.stringify(session));
  }

  // Supprime la session (déconnexion ou expiration)
  clear(): void {
    localStorage.removeItem(CLE_SESSION);
  }

  // Vérifie si une session existe et n'est pas expirée
  isValid(): boolean {
    const session = this.get();
    return !!session && session.expires_at > Date.now();
  }

  // Détermine la route de login à utiliser selon le type de session
  // (id_user = compte admin/staff, id_famille = compte parent)
  getLoginRoute(session: Session | null): string[] {
    if (session?.id_user) return ['/admin/login'];
    if (session?.id_famille) return ['/espace-parent/login'];
    // Par défaut (aucune info connue) : on renvoie vers le login parent
    return ['/espace-parent/login'];
  }
}