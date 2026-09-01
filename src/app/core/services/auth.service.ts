// auth.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CacheService } from './cache.service';
import { compare, hash } from 'bcryptjs';
import { AppUser, AppUserEnrichi, PermissionId, Section } from '../models';
import { AddServices, GetServices, H, SHEET, toRow } from './@data';
import { DataServiceBase } from './@data/_data.base.service';
import { SessionService } from './@session/session.service';
import { GoogleSheetsService, RowConfig } from './@google-sheets/google-sheets.service';

const STORAGE_KEY = 'app_user';
const SECTION_KEY = 'app_section';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private cache = inject(CacheService);
  private get = inject(GetServices);
  private loa = inject(DataServiceBase)
  private router = inject(Router);   // injecté ici, pas dans logout()
  private sheet = inject(GoogleSheetsService)
  // initAppData
  // ── State ─────────────────────────────────────────────────────────
  private _user = signal<AppUserEnrichi | null>(this.loadUser());
  private _section = signal<Section>(
    (localStorage.getItem(SECTION_KEY) as Section) ?? 'secondaire'
  );

  readonly user = this._user.asReadonly();
  readonly section = this._section.asReadonly();
  readonly isLogged = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.is_admin === "OUI" || this._user()?.is_admin === true);
  private sessionService = inject(SessionService);

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

  async login(username: string, password: string): Promise<'incorrect' | 'non-actif' | 'success'> {
    // S'assure que les utilisateurs sont bien chargés avant de vérifier
    // (peut déjà être en cache si initAppData a tourné avant)
    try {

      if (this.get.getUsers().length === 0) await this.loa.loadUsers();

      const users = this.get.getUsers()
      var u: AppUser = null as unknown as AppUser;

      // Si aucun utilisateur n'existe, crée un super-admin par défaut  
      if (users && users.length === 0) {
        u = await this.createSuperAdmin()
      } else {
        u = users.find(x => x.username === username);
        if (!u) return 'incorrect';
        const ok = await compare(password, u.mot_de_passe);
        if (!ok) return 'incorrect';
        if (u.status !== 'ACTIF') return 'non-actif';
      }

      this.sessionService.creer({ id_user: u.id });

      this._user.set(u);
      this._section.set(u.section);
      this.cache.setSection(u.section);   // synchronise le filtre classes
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      localStorage.setItem(SECTION_KEY, u.section);
      this.loa.initAppData()
      return 'success';
    } catch (error) {
      console.error('Erreur lors de la connexion :', error);
      return 'incorrect';
    }
  }

  logout(): void {
    this._user.set(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SECTION_KEY);
    this.sessionService.clear();
    this.cache.invalidateAll();         // vide les données locales
    this.router.navigate(['/admin/login']);
  }

  // ── Permissions ───────────────────────────────────────────────────

  hasPermission(p: PermissionId): boolean {
    const u = this._user();
    if (!u) return false;
    if (this.isAdmin()) return true;
    return u.permissions.includes(p);
  }

  hasRole(...roles: string[]): boolean {
    const u = this._user();
    if (!u) return false;
    if (this.isAdmin()) return true;
    return roles.includes(u.role);
  }

  getClassesAssignees(): string[] {
    const u = this._user();
    if (!u || this.isAdmin()) return [];
    return [];
  }

  // ── Helpers privés ────────────────────────────────────────────────

  private loadUser(): AppUserEnrichi | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  private async createSuperAdmin(): Promise<AppUser> {
    const password = await hash('admin', 5);
    const user: AppUser = {
      id: `USR-${Date.now()}`,
      username: 'admin',
      mot_de_passe: password,
      nom: 'admin',
      tel: '',
      role: 'admin',
      status: 'ACTIF',
      is_admin: 'OUI',
      section: 'secondaire',
      permissions: null as unknown as PermissionId[],
    };
    const rowConfig: RowConfig = {
      sheetName: SHEET.users,
      rowData: toRow(user, H.users)
    };

    await this.sheet.addRow(rowConfig);
    return user;
  }
}