// user-modal.component.ts — création et modification d'utilisateur
// Modal MatDialog — style bl-* cohérent avec le reste de l'app
// Gestion des permissions par checkboxes, section, rôle, mot de passe
import {
  Component, inject, signal, computed, OnInit
} from '@angular/core';
import {
  FormGroup, FormControl, ReactiveFormsModule, Validators, AbstractControl
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AppUser, PERMISSIONS, PermissionId, Role, Section } from '../../../core/models';
import { DataService } from '../../../core/services/data.service';
import { hash } from 'bcryptjs';

export interface UserModalData {
  user?: AppUser;   // undefined = création, défini = modification
}

const ROLES: { val: Role; label: string }[] = [
  { val: 'admin',       label: 'Administrateur' },
  { val: 'caissier',    label: 'Caissier'       },
  { val: 'enseignant',  label: 'Enseignant'     },
  { val: 'surveillant', label: 'Surveillant'    },
];

@Component({
  selector: 'app-user-modal',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule],
  styles: [`
    /* ── Layout modal ── */
    .host  { display:flex; flex-direction:column; width:100%;
             max-width:520px; font-size:13px; }
    .head  { display:flex; align-items:center; justify-content:space-between;
             padding:14px 18px 12px;
             border-bottom:0.5px solid rgba(0,0,0,.09); }
    .head-title { font-size:14px; font-weight:500; }
    .body  { padding:16px 18px; display:flex; flex-direction:column; gap:13px;
             max-height:72vh; overflow-y:auto; }
    .foot  { display:flex; justify-content:flex-end; gap:8px;
             padding:11px 18px 14px;
             border-top:0.5px solid rgba(0,0,0,.09); }

    /* ── Champs ── */
    .row2  { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .field { display:flex; flex-direction:column; gap:3px; }
    label  { font-size:11px; color:#888; font-weight:500; }
    .fi    { height:34px; padding:0 10px; font-size:13px;
             border:0.5px solid rgba(0,0,0,.18); border-radius:6px;
             background:white; outline:none; color:#333; width:100%;
             transition:border-color .15s; }
    .fi:focus   { border-color:#185FA5; }
    .fi.err     { border-color:#A32D2D; }
    select.fi   { cursor:pointer; }
    .hint       { font-size:10px; color:#A32D2D; }

    /* ── Toggle actif ── */
    .tog-row  { display:flex; align-items:center; gap:8px;
                padding:6px 0; cursor:pointer; }
    .tog      { width:30px; height:17px; border-radius:9px; background:#ccc;
                position:relative; cursor:pointer; transition:background .2s;
                display:inline-block; flex-shrink:0; }
    .tog.on   { background:#185FA5; }
    .tog::after { content:''; position:absolute; top:2px; left:2px;
                  width:13px; height:13px; background:white; border-radius:50%;
                  transition:transform .2s; }
    .tog.on::after { transform:translateX(13px); }
    .tog-label { font-size:12px; color:#555; user-select:none; }

    /* ── Permissions ── */
    .perms-head { display:flex; align-items:center; justify-content:space-between;
                  margin-bottom:6px; }
    .perms-title{ font-size:11px; color:#888; font-weight:500; }
    .perms-grid { display:grid;
                  grid-template-columns:repeat(auto-fill, minmax(155px, 1fr));
                  gap:5px; }
    .perm-item  { display:flex; align-items:center; gap:7px; padding:5px 8px;
                  border-radius:5px; border:0.5px solid rgba(0,0,0,.09);
                  cursor:pointer; background:white; transition:all .12s; }
    .perm-item:hover { border-color:#B5D4F4; background:#f5f9ff; }
    .perm-item.on { background:#EBF3FC; border-color:#B5D4F4; }
    .perm-chk   { width:13px; height:13px; accent-color:#185FA5;
                  cursor:pointer; flex-shrink:0; }
    .perm-label { font-size:11px; color:#444; user-select:none; }

    /* ── Mot de passe ── */
    .pwd-wrap { position:relative; }
    .pwd-eye  { position:absolute; right:8px; top:50%; transform:translateY(-50%);
                background:none; border:none; cursor:pointer; color:#aaa;
                display:flex; align-items:center; padding:2px; }
    .pwd-eye:hover { color:#555; }

    /* ── Boutons ── */
    .btn  { height:32px; padding:0 14px; border-radius:6px; font-size:13px;
            cursor:pointer; display:inline-flex; align-items:center; gap:5px;
            border:0.5px solid rgba(0,0,0,.18); background:white; color:#333; }
    .btn:disabled { opacity:.35; cursor:default; }
    .btn:not(:disabled):hover { background:#f5f5f5; }
    .btn-p  { background:#185FA5; color:#fff; border:none; }
    .btn-p:not(:disabled):hover { opacity:.88; }
    .btn-del{ background:#FCEBEB; color:#A32D2D; border-color:#F09595; }
    .btn-del:hover { opacity:.88; }
    .close  { width:28px; height:28px; border:0.5px solid rgba(0,0,0,.12);
              background:white; border-radius:5px; cursor:pointer;
              display:flex; align-items:center; justify-content:center; color:#555; }
    .close:hover { background:#FCEBEB; color:#A32D2D; }
    .spinner{ width:13px; height:13px; border-radius:50%;
              border:2px solid rgba(255,255,255,.3); border-top-color:#fff;
              animation:sp .7s linear infinite; display:inline-block; }
    @keyframes sp { to { transform:rotate(360deg); } }

    /* ── Séparateur ── */
    .divider { height:0.5px; background:rgba(0,0,0,.07); margin:2px 0; }

    /* ── Admin badge ── */
    .admin-warn { background:#FFF8E1; border:0.5px solid #FFD54F;
                  border-radius:6px; padding:8px 10px; font-size:11px;
                  color:#5D4037; display:flex; align-items:flex-start; gap:6px; }
  `],
  template: `
<div class="host">

  <!-- En-tête -->
  <div class="head">
    <span class="head-title">
      {{ isEdit ? "Modifier l\'utilisateur" : "Nouvel utilisateur" }}
    </span>
    <button class="close" mat-dialog-close>✕</button>
  </div>

  <div class="body">
    <form [formGroup]="form">

      <!-- Nom + Identifiant -->
      <div class="row2">
        <div class="field">
          <label>Nom complet *</label>
          <input class="fi" [class.err]="fc.nom.invalid && fc.nom.touched"
                 formControlName="nom" placeholder="ex: Marie Dupont">
          @if (fc.nom.invalid && fc.nom.touched) {
            <div class="hint">Requis</div>
          }
        </div>
        <div class="field">
          <label>Identifiant (login) *</label>
          <input class="fi" [class.err]="fc.username.invalid && fc.username.touched"
                 formControlName="username" placeholder="ex: m.dupont"
                 [readOnly]="isEdit" [style.opacity]="isEdit ? '.6' : '1'">
          @if (fc.username.invalid && fc.username.touched) {
            <div class="hint">Requis — min. 3 caractères</div>
          }
        </div>
      </div>

      <!-- Mot de passe -->
      <div class="field">
        <label>
          Mot de passe
          @if (isEdit) { <span style="color:#aaa;font-weight:400">
            (laisser vide pour conserver l'actuel)</span>
          } @else { <span style="color:#A32D2D">*</span> }
        </label>
        <div class="pwd-wrap">
          <input class="fi"
                 [class.err]="fc.password.invalid && fc.password.touched"
                 [type]="showPwd() ? 'text' : 'password'"
                 formControlName="password"
                 [placeholder]="isEdit ? '••••••••' : 'Minimum 6 caractères'"
                 style="padding-right:36px">
          <button type="button" class="pwd-eye"
                  (click)="showPwd.set(!showPwd())">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              @if (showPwd()) {
                <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
                      stroke="currentColor" stroke-width="1.3"/>
                <circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.3"/>
                <path d="M2 2l12 12" stroke="currentColor" stroke-width="1.3"
                      stroke-linecap="round"/>
              } @else {
                <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
                      stroke="currentColor" stroke-width="1.3"/>
                <circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.3"/>
              }
            </svg>
          </button>
        </div>
        @if (fc.password.invalid && fc.password.touched) {
          <div class="hint">
            @if (!isEdit) { Requis — minimum 6 caractères }
            @else { Minimum 6 caractères si vous souhaitez changer }
          </div>
        }
      </div>

      <!-- Rôle + Section -->
      <div class="row2">
        <div class="field">
          <label>Rôle *</label>
          <select class="fi" formControlName="role" (change)="onRoleChange()">
            @for (r of ROLES; track r.val) {
              <option [value]="r.val">{{ r.label }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>Section</label>
          <select class="fi" formControlName="section">
            <option value="primaire">Primaire</option>
            <option value="secondaire">Secondaire</option>
          </select>
        </div>
      </div>

      <!-- Avertissement admin -->
      @if (fc.role.value === 'admin') {
        <div class="admin-warn">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;margin-top:1px">
            <path d="M8 2L1 13h14L8 2z" stroke="#F57F17" stroke-width="1.3"
                  stroke-linejoin="round"/>
            <path d="M8 6v4M8 11v.5" stroke="#F57F17" stroke-width="1.3"
                  stroke-linecap="round"/>
          </svg>
          Un administrateur a accès à <strong>toutes les fonctionnalités</strong>
          sans restriction de permissions.
        </div>
      }

      <div class="divider"></div>

      <!-- Permissions -->
      @if (fc.role.value !== 'admin') {
        <div>
          <div class="perms-head">
            <span class="perms-title">Permissions accordées</span>
            <div style="display:flex;gap:6px">
              <button type="button" class="btn" style="height:26px;font-size:11px;padding:0 10px"
                      (click)="toutCocher()">Tout cocher</button>
              <button type="button" class="btn" style="height:26px;font-size:11px;padding:0 10px"
                      (click)="toutDecocher()">Tout décocher</button>
            </div>
          </div>

          <div class="perms-grid">
            @for (p of PERMISSIONS; track p.id) {
              <label class="perm-item" [class.on]="aPermission(p.id)">
                <input type="checkbox" class="perm-chk"
                       [checked]="aPermission(p.id)"
                       (change)="togglePerm(p.id, $event)">
                <span class="perm-label">{{ p.label }}</span>
              </label>
            }
          </div>
        </div>
      }

    </form>
  </div>

  <!-- Pied -->
  <div class="foot">
    @if (isEdit) {
      <button class="btn btn-del" (click)="supprimer()">
        Supprimer
      </button>
    }
    <span style="flex:1"></span>
    <button class="btn" mat-dialog-close>Annuler</button>
    <button class="btn btn-p" (click)="sauvegarder()"
            [disabled]="form.invalid || saving()">
      @if (saving()) { <span class="spinner"></span> }
      {{ saving() ? 'Enregistrement…' : (isEdit ? 'Mettre à jour' : 'Créer') }}
    </button>
  </div>

</div>
  `
})
export class UserModalComponent implements OnInit {

  readonly data     = inject<UserModalData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<UserModalComponent>);
  private snack     = inject(MatSnackBar);
  private DataService = inject(DataService);

  readonly PERMISSIONS = PERMISSIONS;
  readonly ROLES       = ROLES;

  isEdit  = false;
  saving  = signal(false);
  showPwd = signal(false);

  // Signal pour les permissions — évite FormControl dans computed()
  perms = signal<Set<PermissionId>>(new Set());

  form = new FormGroup({
    nom:      new FormControl('', [Validators.required, Validators.minLength(2)]),
    username: new FormControl('', [Validators.required, Validators.minLength(3)]),
    password: new FormControl(''),  // validé dynamiquement dans ngOnInit
    role:     new FormControl<Role>('enseignant'),
    section:  new FormControl<Section>('secondaire'),
  });

  get fc() { return this.form.controls; }

  ngOnInit(): void {
    const u = this.data?.user;

    if (u) {
      // ── Mode modification ──────────────────────────────────────
      this.isEdit = true;
      this.form.patchValue({
        nom:     u.nom,
        username: u.username,
        role:    u.role,
        section: u.section,
      });
      // Mot de passe optionnel en modification
      this.fc.password.setValidators([]);
      this.fc.password.updateValueAndValidity();
      // Permissions depuis l'utilisateur existant
      this.perms.set(new Set(u.permissions));
    } else {
      // ── Mode création ──────────────────────────────────────────
      this.fc.password.setValidators([Validators.required, Validators.minLength(6)]);
      this.fc.password.updateValueAndValidity();
      // Permissions par défaut selon le rôle initial
      this._permissionsParDefaut('enseignant');
    }
  }

  // ── Permissions ───────────────────────────────────────────────────

  aPermission(p: PermissionId): boolean { return this.perms().has(p); }

  togglePerm(p: PermissionId, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.perms.update(s => {
      const n = new Set(s);
      checked ? n.add(p) : n.delete(p);
      return n;
    });
  }

  toutCocher(): void {
    this.perms.set(new Set(PERMISSIONS.map(p => p.id)));
  }

  toutDecocher(): void { this.perms.set(new Set()); }

  /** Quand le rôle change, pré-sélectionne les permissions cohérentes */
  onRoleChange(): void {
    this._permissionsParDefaut(this.fc.role.value as Role);
  }

  private _permissionsParDefaut(role: Role): void {
    const map: Record<Role, PermissionId[]> = {
      admin:       PERMISSIONS.map(p => p.id),
      caissier:    ['insolvables', 'familles'],
      enseignant:  ['notes', 'bulletins', 'absences', 'eleves'],
      surveillant: ['absences', 'eleves'],
    };
    this.perms.set(new Set(map[role] ?? []));
  }

  // ── Sauvegarde ────────────────────────────────────────────────────

  async sauvegarder(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.saving.set(true);

    const isAdmin = this.fc.role.value === 'admin';
    const hashedPassword = this.fc.password.value?.trim()
      ? await hash(this.fc.password.value.trim(), 5)
      : (this.data?.user?.mot_de_passe ?? '');

    const user: AppUser = {
      id:          this.data?.user?.id ?? `USR-${Date.now()}`,
      username:    this.fc.username.value!,
      mot_de_passe: hashedPassword,
      nom:         this.fc.nom.value!,
      role:        this.fc.role.value as Role,
      is_admin:    isAdmin,
      section:     this.fc.section.value as Section,
      permissions: isAdmin
        ? PERMISSIONS.map(p => p.id)
        : [...this.perms()],
    };

    if(this.isEdit) {
      await this.DataService.updateUser(user);
    } else {
      await this.DataService.addUser(user);
    }
    
    this.saving.set(false);
    this.snack.open(
      this.isEdit ? 'Utilisateur mis à jour' : 'Utilisateur créé',
      'OK',
      { duration: 3000 }
    );
    this.dialogRef.close({ success: true, user });
  }

  supprimer(): void {
    if (!confirm(`Supprimer ${this.data?.user?.nom} ? Cette action est irréversible.`)) return;
    this.dialogRef.close({ deleted: true, userId: this.data?.user?.id });
  }
}