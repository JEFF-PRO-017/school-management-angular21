// auth.service.ts — authentification locale + gestion des rôles
// En production : remplacer le mock par un vrai backend JWT
import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AppUser, Role } from '../models';

const STORAGE_KEY = 'school_user';

// Utilisateurs de test — à remplacer par un appel API en production
const MOCK_USERS: AppUser[] = [
  { id: 'u1', nom: 'Directeur',  email: 'admin@ecole.cm',      role: 'admin' },
  { id: 'u2', nom: 'Caissier',   email: 'caissier@ecole.cm',   role: 'caissier' },
  { id: 'u3', nom: 'Prof Maths', email: 'prof1@ecole.cm',      role: 'enseignant', classesAssignees: ['CL001','CL002'] },
];

@Injectable({ providedIn: 'root' })
export class AuthService {

  private _user = signal<AppUser | null>(this.loadFromStorage());

  /** Utilisateur connecté (signal public en lecture) */
  readonly user     = this._user.asReadonly();
  readonly isLogged = computed(() => !!this._user());
  readonly role     = computed(() => this._user()?.role ?? null);
  readonly isAdmin  = computed(() => this._user()?.role === 'admin');

  constructor(private router: Router) {}

  /** Connexion par email + mot de passe (mock — adapter pour prod) */
  login(email: string, password: string): boolean {
    const found = MOCK_USERS.find(u => u.email === email);
    if (!found) return false;
    // En prod : valider le mot de passe contre un hash
    this._user.set(found);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(found));
    return true;
  }

  logout(): void {
    this._user.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
    this.router.navigate(['/auth/login']);
  }

  /** Vérifie si l'utilisateur possède un des rôles requis */
  hasRole(...roles: Role[]): boolean {
    const current = this._user()?.role;
    return !!current && roles.includes(current);
  }

  /** Retourne les classes assignées à un enseignant */
  getClassesAssignees(): string[] {
    return this._user()?.classesAssignees ?? [];
  }

  private loadFromStorage(): AppUser | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
