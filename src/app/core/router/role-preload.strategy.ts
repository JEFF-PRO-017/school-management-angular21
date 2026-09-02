// core/router/role-preload.strategy.ts
// Précharge un chunk seulement si le rôle en session y a droit.
// Sinon, ne précharge rien (le chunk se chargera normalement si l'utilisateur y navigue quand même).
import { Injectable, inject } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';
import { SessionService } from '../services/@session/session.service';

@Injectable({ providedIn: 'root' })
export class RolePreloadStrategy implements PreloadingStrategy {
  private sessionService = inject(SessionService);

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    const session = this.sessionService.get();

    // Pas de session → on ne précharge rien (tout se chargera à la demande)
    if (!session) return of(null);

    const estAdmin = !!session.id_user;
    const estParent = !!session.id_famille;

    // Chunks sous espace-administration : uniquement si connecté admin/staff
    if (route.path === 'espace-administration' || this.appartientA(route, 'administration')) {
      return estAdmin ? load() : of(null);
    }

    // Chunks sous espace-parent : uniquement si connecté parent
    if (route.path === 'espace-parent' || this.appartientA(route, 'parents')) {
      return estParent ? load() : of(null);
    }

    // Routes publiques (login, launcher…) : préchargement normal
    return load();
  }

  // Vérifie l'origine du chunk via son chemin de chargement (loadChildren/loadComponent stringifié)
  private appartientA(route: Route, dossier: string): boolean {
    const fn = (route.loadChildren ?? route.loadComponent)?.toString() ?? '';
    return fn.includes(`/${dossier}/`);
  }
}