// auth.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CacheService } from './cache.service';
import { compare } from 'bcryptjs';
import { AppUserEnrichi, PermissionId, Section } from '../models';
import { GetServices } from './@data';
import { DataServiceBase } from './@data/_data.base.service';

const STORAGE_KEY = 'app_user';
const SECTION_KEY = 'app_section';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private cache = inject(CacheService);
  private get = inject(GetServices);
  private loa = inject(DataServiceBase)
  private router = inject(Router);   // injecté ici, pas dans logout()
  // initAppData
  // ── State ─────────────────────────────────────────────────────────
  private _user = signal<AppUserEnrichi | null>(this.loadUser());
  private _section = signal<Section>(
    (localStorage.getItem(SECTION_KEY) as Section) ?? 'secondaire'
  );

  readonly user = this._user.asReadonly();
  readonly section = this._section.asReadonly();
  readonly isLogged = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.is_admin === true);

  // ── Section ───────────────────────────────────────────────────────

  setSection(s: Section): void {
    if (!this.isAdmin()) return;
    this._section.set(s);
    localStorage.setItem(SECTION_KEY, s);
    this.cache.setSection(s);
  }

  getSectionActive(): Section {
    return this.isAdmin()
      ? this._section()
      : (this._user()?.section ?? 'secondaire');
  }

  // ── Auth ──────────────────────────────────────────────────────────

  async login(username: string, password: string): Promise<boolean> {
    // S'assure que les utilisateurs sont bien chargés avant de vérifier
    // (peut déjà être en cache si initAppData a tourné avant)
    if (this.get.getUsers().length === 0) {
      await this.get.loadUsers();
    }

    const u = this.get.getUsers().find(x => x.username === username);
    if (!u) return false;

    const ok = await compare(password, u.mot_de_passe);
    if (!ok) return false;

    this._user.set(u);
    this._section.set(u.section);
    this.cache.setSection(u.section);   // synchronise le filtre classes
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    localStorage.setItem(SECTION_KEY, u.section);
    this.loa.initAppData()
    return true;
  }

  logout(): void {
    this._user.set(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SECTION_KEY);
    this.cache.invalidateAll();         // vide les données locales
    this.router.navigate(['/auth/login']);
  }

  // ── Permissions ───────────────────────────────────────────────────

  hasPermission(p: PermissionId): boolean {
    const u = this._user();
    if (!u) return false;
    if (u.is_admin) return true;
    return u.permissions.includes(p);
  }

  hasRole(...roles: string[]): boolean {
    const u = this._user();
    if (!u) return false;
    if (u.is_admin) return true;
    return roles.includes(u.role);
  }

  getClassesAssignees(): string[] {
    const u = this._user();
    if (!u || u.is_admin) return [];
    return [];
  }

  // ── Helpers privés ────────────────────────────────────────────────

  private loadUser(): AppUserEnrichi | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
}