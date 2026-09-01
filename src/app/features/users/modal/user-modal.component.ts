import {
  Component, inject, signal, OnInit
} from '@angular/core';
import {
  FormGroup, FormControl, ReactiveFormsModule,
  Validators, ValidatorFn, AbstractControl, ValidationErrors
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

// import { AppUser, PERMISSIONS, PermissionId, Role, Section } from '../../../core/models/last_index';
import { hash } from 'bcryptjs';
import { AddServices, GetServices, PatchServices } from '../../../core/services/@data';
import { DeleteServices } from '../../../core/services/@data/_delete.services';
import { AppUser, Role, PERMISSIONS, PermissionId, Section } from '../../../core/models';

export interface UserModalData { user?: AppUser; }

const ROLES: { val: Role; label: string }[] = [
  { val: 'admin', label: 'Administrateur' },
  { val: 'caissier', label: 'Caissier' },
  { val: 'enseignant', label: 'Enseignant' },
  { val: 'surveillant', label: 'Surveillant' },
];

@Component({
  selector: 'app-user-modal',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule],
  styles: [`
    /* Toggle switch — pas d'équivalent Bootstrap natif */
    .tog { width:30px; height:17px; border-radius:9px; background:#ccc;
           position:relative; cursor:pointer; transition:background .2s;
           display:inline-block; flex-shrink:0; }
    .tog.on { background:#185FA5; }
    .tog::after { content:''; position:absolute; top:2px; left:2px;
                  width:13px; height:13px; background:white; border-radius:50%;
                  transition:transform .2s; }
    .tog.on::after { transform:translateX(13px); }
    /* Bouton œil dans le champ password */
    .pwd-eye { position:absolute; right:8px; top:50%; transform:translateY(-50%);
               background:none; border:none; cursor:pointer; color:#aaa;
               display:flex; align-items:center; padding:2px; }
    .pwd-eye:hover { color:#555; }
    /* Spinner bouton save */
    .spinner { width:13px; height:13px; border-radius:50%;
               border:2px solid rgba(255,255,255,.3); border-top-color:#fff;
               animation:sp .7s linear infinite; display:inline-block; }
    @keyframes sp { to { transform:rotate(360deg); } }
    /* Hauteur max du corps scrollable */
    .modal-body { max-height:72vh; overflow-y:auto; }
    /* Perm hover */
    .perm-item:hover { border-color:#B5D4F4 !important; background:#f5f9ff !important; }
    .perm-item.on    { background:#EBF3FC !important; border-color:#B5D4F4 !important; }
  `],
  template: `
<div class="d-flex flex-column" style="width:100%;max-width:540px">

  <!-- En-tête -->
  <div class="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
    <span class="fw-semibold small">
      {{ isEdit ? "Modifier l'utilisateur" : "Nouvel utilisateur" }}
    </span>
    <button class="btn btn-sm btn-outline-secondary px-2 py-0" mat-dialog-close>✕</button>
  </div>

  <!-- Corps -->
  <div class="modal-body px-3 py-3">
    <form [formGroup]="form">

      <!-- Nom + Username -->
      <div class="row g-2 mb-2">
        <div class="col-6">
          <label class="form-label small text-muted fw-semibold mb-1">Nom complet *</label>
          <input class="form-control form-control-sm"
                 [class.is-invalid]="fc.nom.invalid && fc.nom.touched"
                 [class.is-valid]="fc.nom.valid && fc.nom.touched"
                 formControlName="nom" placeholder="ex: Marie Dupont">
          <div class="invalid-feedback">Requis — min. 2 caractères</div>
        </div>
        <div class="col-6">
          <label class="form-label small text-muted fw-semibold mb-1">
            Identifiant *
            @if (isEdit) {
              <span class="fw-normal text-muted">(non modifiable)</span>
            }
          </label>
          <input class="form-control form-control-sm"
                 [class.is-invalid]="fc.username.invalid && fc.username.touched"
                 [class.is-valid]="fc.username.valid && fc.username.touched"
                 formControlName="username" placeholder="ex: m.dupont"
                 [readOnly]="isEdit" [style.opacity]="isEdit ? '.6' : '1'">
          @if (fc.username.errors?.['taken'] && fc.username.touched) {
            <div class="invalid-feedback d-block">Identifiant déjà utilisé.</div>
          } @else if (fc.username.invalid && fc.username.touched) {
            <div class="invalid-feedback">Requis — min. 3 caractères</div>
          }
          @if (fc.username.valid && fc.username.touched && !isEdit) {
            <div class="valid-feedback d-block">✔ Identifiant disponible</div>
          }
        </div>
      </div>

      <!-- Téléphone -->
      <div class="mb-2">
        <label class="form-label small text-muted fw-semibold mb-1">Téléphone</label>
        <input class="form-control form-control-sm"
               [class.is-invalid]="fc.tel.invalid && fc.tel.touched"
               formControlName="tel" placeholder="ex: 6XXXXXXXX" type="tel">
        <div class="invalid-feedback">Format invalide (8 à 15 chiffres)</div>
        <div class="form-text" style="font-size:10px">
          Utilisé pour les notifications et la récupération de compte.
        </div>
      </div>

      <!-- Mot de passe -->
      <div class="mb-2">
        <label class="form-label small text-muted fw-semibold mb-1">
          Mot de passe
          @if (isEdit) {
            <span class="fw-normal text-muted">(vide = conserver l'actuel)</span>
          } @else {
            <span class="text-danger">*</span>
          }
        </label>
        <div class="position-relative">
          <input class="form-control form-control-sm pe-5"
                 [class.is-invalid]="fc.password.invalid && fc.password.touched"
                 [type]="showPwd() ? 'text' : 'password'"
                 formControlName="password"
                 [placeholder]="isEdit ? '••••••••' : 'Minimum 6 caractères'">
          <button type="button" class="pwd-eye" (click)="showPwd.set(!showPwd())">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              @if (showPwd()) {
                <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
                      stroke="currentColor" stroke-width="1.3"/>
                <circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.3"/>
                <path d="M2 2l12 12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              } @else {
                <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
                      stroke="currentColor" stroke-width="1.3"/>
                <circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.3"/>
              }
            </svg>
          </button>
          <div class="invalid-feedback">
            @if (!isEdit) { Requis — minimum 6 caractères }
            @else { Minimum 6 caractères si vous souhaitez changer }
          </div>
        </div>
      </div>

      <!-- Rôle + Section -->
      <div class="row g-2 mb-2">
        <div class="col-4">
          <label class="form-label small text-muted fw-semibold mb-1">Rôle *</label>
          <select class="form-select form-select-sm" formControlName="role" (change)="onRoleChange()">
            @for (r of ROLES; track r.val) {
              <option [value]="r.val">{{ r.label }}</option>
            }
          </select>
        </div>

        <div class="col-4">
          <label class="form-label small text-muted fw-semibold mb-1">Status</label>
          <select class="form-select form-select-sm" formControlName="status">
            <option value="ACTIF">Actif</option>
            <option value="NON-ACTIF">Non Actif</option>
          </select>
        </div>
        
        <div class="col-4">
          <label class="form-label small text-muted fw-semibold mb-1">Section</label>
          <select class="form-select form-select-sm" formControlName="section">
            <option value="primaire">Primaire</option>
            <option value="secondaire">Secondaire</option>
          </select>
        </div>
      </div>

      <!-- Avertissement admin -->
      @if (fc.role.value === 'admin') {
        <div class="alert alert-warning py-2 px-3 d-flex gap-2 align-items-start small mb-2">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;margin-top:2px">
            <path d="M8 2L1 13h14L8 2z" stroke="#F57F17" stroke-width="1.3" stroke-linejoin="round"/>
            <path d="M8 6v4M8 11v.5" stroke="#F57F17" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          Un administrateur a accès à <strong>&nbsp;toutes les fonctionnalités&nbsp;</strong>
          sans restriction de permissions.
        </div>
      }

      <hr class="my-2">

      <!-- Permissions -->
      @if (fc.role.value !== 'admin') {
        <div>
          <div class="d-flex align-items-center justify-content-between mb-1">
            <span class="form-label small text-muted fw-semibold mb-0">Permissions accordées</span>
            <div class="d-flex gap-1">
              <button type="button" class="btn btn-outline-secondary btn-sm py-0 px-2"
                      style="font-size:11px" (click)="toutCocher()">Tout cocher</button>
              <button type="button" class="btn btn-outline-secondary btn-sm py-0 px-2"
                      style="font-size:11px" (click)="toutDecocher()">Tout décocher</button>
            </div>
          </div>
          <p class="text-muted mb-2" style="font-size:10px">
            Cochez les modules auxquels cet utilisateur aura accès.
          </p>

          <div class="row row-cols-2 g-1">
            @for (p of PERMISSIONS; track p.id) {
              <div class="col">
                <label class="perm-item d-flex align-items-center gap-2 p-2 rounded border w-100 cursor-pointer"
                       [class.on]="aPermission(p.id)" style="font-size:11px;color:#444">
                  <input type="checkbox" class="form-check-input mt-0 flex-shrink-0"
                         [checked]="aPermission(p.id)"
                         (change)="togglePerm(p.id, $event)">
                  {{ p.label }}
                </label>
              </div>
            }
          </div>
        </div>
      }

    </form>
  </div>

  <!-- Pied -->
  <div class="d-flex align-items-center gap-2 px-3 py-2 border-top">
    @if (isEdit) {
      <button class="btn btn-sm btn-outline-danger" (click)="supprimer()">Supprimer</button>
    }
    <span class="flex-grow-1"></span>
    <button class="btn btn-sm btn-outline-secondary" mat-dialog-close>Annuler</button>
    <button class="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
            (click)="sauvegarder()" [disabled]="form.invalid || saving()">
      @if (saving()) { <span class="spinner"></span> }
      {{ saving() ? 'Enregistrement…' : (isEdit ? 'Mettre à jour' : 'Créer') }}
    </button>
  </div>

</div>
  `
})
export class UserModalComponent implements OnInit {

  readonly data = inject<UserModalData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<UserModalComponent>);
  private snack = inject(MatSnackBar);
  private patch = inject(PatchServices)
  private add = inject(AddServices)
  private get = inject(GetServices)
  private delete = inject(DeleteServices)
  readonly PERMISSIONS = PERMISSIONS;
  readonly ROLES = ROLES;

  isEdit = false;
  saving = signal(false);
  showPwd = signal(false);
  perms = signal<Set<PermissionId>>(new Set());

  form = new FormGroup({
    nom: new FormControl('', [Validators.required, Validators.minLength(2)]),
    username: new FormControl('', {
      validators: [Validators.required, Validators.minLength(3), this.usernameUnique()],
      updateOn: 'blur',
    }),
    tel: new FormControl('', [Validators.pattern(/^\d{8,15}$/)]),
    password: new FormControl(''),
    role: new FormControl<Role>('enseignant'),
    section: new FormControl<Section>('secondaire'),
    status: new FormControl<'ACTIF' | 'NON-ACTIF'>('ACTIF'),
  });

  get fc() { return this.form.controls; }

  private usernameUnique(): ValidatorFn {
    return (ctrl: AbstractControl): ValidationErrors | null => {
      const taken = this.get?.getUsers().some(u =>
        u.username === ctrl.value && u.id !== this.data?.user?.id
      );
      return taken ? { taken: true } : null;
    };
  }

  ngOnInit(): void {
    const u = this.data?.user;
    if (u) {
      this.isEdit = true;
      this.form.patchValue({ nom: u.nom, username: u.username, role: u.role, status: u.status, section: u.section, tel: u.tel ?? '' });
      this.fc.username.clearValidators();
      this.fc.username.updateValueAndValidity();
      this.fc.password.clearValidators();
      this.fc.password.updateValueAndValidity();
      this.perms.set(new Set(u.permissions));
    } else {
      this.fc.password.setValidators([Validators.required, Validators.minLength(6)]);
      this.fc.password.updateValueAndValidity();
      this._permissionsParDefaut('enseignant');
    }
  }

  aPermission(p: PermissionId) { return this.perms().has(p); }

  togglePerm(p: PermissionId, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.perms.update(s => { const n = new Set(s); checked ? n.add(p) : n.delete(p); return n; });
  }

  toutCocher() { this.perms.set(new Set(PERMISSIONS.map(p => p.id))); }
  toutDecocher() { this.perms.set(new Set()); }

  onRoleChange() { this._permissionsParDefaut(this.fc.role.value as Role); }

  private _permissionsParDefaut(role: Role) {
    const map: Record<Role, PermissionId[]> = {
      admin: PERMISSIONS.map(p => p.id),
      caissier: ['insolvables', 'familles'],
      enseignant: ['notes', 'bulletins', 'absences', 'eleves'],
      surveillant: ['absences', 'eleves'],
    };
    this.perms.set(new Set(map[role] ?? []));
  }

  async sauvegarder(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.saving.set(true);
    const isAdmin = this.fc.role.value === 'admin';
    const hashedPassword = this.fc.password.value?.trim()
      ? await hash(this.fc.password.value.trim(), 5)
      : (this.data?.user?.mot_de_passe ?? '');

    const user: AppUser = {
      id: this.data?.user?.id ?? `USR-${Date.now()}`,
      username: this.fc.username.value!,
      mot_de_passe: hashedPassword,
      nom: this.fc.nom.value!,
      tel: this.fc.tel.value ?? '',
      role: this.fc.role.value as Role,
      status: this.fc.status.value as 'ACTIF' | 'NON-ACTIF',
      is_admin: isAdmin,
      section: this.fc.section.value as Section,
      permissions: isAdmin ? PERMISSIONS.map(p => p.id) : [...this.perms()],
    };

    if (this.isEdit) {
      await this.patch.updateUser(user);
    } else {
      await this.add.addUser(user);
    }

    this.saving.set(false);
    this.snack.open(
      this.isEdit ? 'Utilisateur mis à jour ✔' : 'Utilisateur créé ✔',
      'OK', { duration: 3000 }
    );
    this.dialogRef.close({ success: true, user });
  }

  supprimer() {
    if (!this.data || !this.data.user || !this.data.user.id) return
    if (!confirm(`Supprimer ${this.data?.user?.nom} ? Cette action est irréversible.`)) return;
    this.delete.deleteUser(this.data?.user?.id)
    this.dialogRef.close({ deleted: true, userId: this.data?.user?.id });
  }
}