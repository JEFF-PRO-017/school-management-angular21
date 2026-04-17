// users-list.component.ts — liste + création + modification via UserModalComponent
import {
  Component, inject, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { MatDialog }   from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AppUser, PERMISSIONS, PermissionId } from '../../../core/models';
import { UserModalData, UserModalComponent } from '../modal/user-modal.component';
import { DataService } from '../../../core/services/data.service';


@Component({
  selector: 'app-users-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
<div class="bl-host">

  <!-- ══ BARRE ══ -->
  <div class="bl-bar">
    <div class="bl-cfg-summary">
      <span class="bl-cfg-titre">Gestion des utilisateurs</span>
      <span class="bl-cfg-seqs">
        {{ users().length }} compte(s) · {{ nbActifs() }} actif(s)
      </span>
    </div>
    <span class="bl-sep"></span>
    <button class="bl-btn bl-btn--primary" (click)="ouvrirCreation()">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v12M2 8h12" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      Nouvel utilisateur
    </button>
  </div>

  <!-- ══ TABLEAU ══ -->
  <div class="bl-table-wrap">
    <table class="bl-table">
      <thead>
        <tr>
          <th class="bl-th" style="text-align:left">Utilisateur</th>
          <th class="bl-th">Rôle</th>
          <th class="bl-th">Section</th>
          <th class="bl-th" style="text-align:left;min-width:220px">
            Permissions
          </th>
          <th class="bl-th">Actions</th>
        </tr>
      </thead>
      <tbody>
        @for (u of users(); track u.id) {
          <tr class="bl-tr">

            <!-- Nom + identifiant -->
            <td class="bl-td bl-td--name">
              <div style="display:flex;align-items:center;gap:7px">
                <!-- Avatar initiales -->
                <div class="bl-av" [style.background]="avBg(u.id)">
                  {{ initiales(u.nom) }}
                </div>
                <div>
                  <div>{{ u.nom }}</div>
                  <div style="font-size:10px;color:#aaa">{{'@'}} {{ u.username }}</div>
                </div>
              </div>
            </td>

            <!-- Rôle -->
            <td class="bl-td bl-td--center">
              <span [class]="roleCls(u.role)">{{ roleLabel(u.role) }}</span>
            </td>

            <!-- Section -->
            <td class="bl-td bl-td--center">
              <span class="bl-mention bl-mention--neu">{{ u.section }}</span>
            </td>

            <!-- Permissions -->
            <td class="bl-td">
              @if (u.is_admin) {
                <span class="bl-perm bl-perm--admin">Accès complet</span>
              } @else {
                <div style="display:flex;flex-wrap:wrap;gap:3px">
                  @for (p of u.permissions.slice(0, 5); track p) {
                    <span class="bl-perm">{{ labelPerm(p) }}</span>
                  }
                  @if (u.permissions.length > 5) {
                    <span class="bl-perm bl-perm--more">
                      +{{ u.permissions.length - 5 }}
                    </span>
                  }
                  @if (u.permissions.length === 0) {
                    <span style="font-size:11px;color:#ccc">Aucune</span>
                  }
                </div>
              }
            </td>

            <!-- Actions -->
            <td class="bl-td bl-td--center">
              <div style="display:flex;gap:5px;justify-content:center">
                <button class="bl-icon-btn" title="Modifier"
                        (click)="ouvrirModification(u)">
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                    <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor"
                          stroke-width="1.3" stroke-linecap="round"
                          stroke-linejoin="round"/>
                  </svg>
                </button>
                @if (!u.is_admin) {
                  <button class="bl-icon-btn bl-icon-btn--del" title="Supprimer"
                          (click)="supprimer(u)">
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                      <path d="M3 5h10M6 5V3h4v2M6 8v4M10 8v4"
                            stroke="currentColor" stroke-width="1.3"
                            stroke-linecap="round"/>
                    </svg>
                  </button>
                }
              </div>
            </td>

          </tr>
        }
      </tbody>
    </table>
  </div>

</div>
  `,
  styles: [`
    .bl-host      { display:flex; flex-direction:column; gap:12px; font-size:13px; }
    .bl-bar       { display:flex; align-items:center; flex-wrap:wrap; gap:8px;
                    padding-bottom:12px; border-bottom:0.5px solid rgba(0,0,0,.09); }
    .bl-sep       { width:0.5px; height:20px; background:rgba(0,0,0,.1); }
    .bl-cfg-summary{ display:flex; flex-direction:column; gap:1px; }
    .bl-cfg-titre { font-size:12px; font-weight:500; }
    .bl-cfg-seqs  { font-size:10px; color:#185FA5; }

    .bl-btn { height:32px; padding:0 14px; border-radius:6px; font-size:13px;
              cursor:pointer; display:inline-flex; align-items:center; gap:5px;
              border:0.5px solid rgba(0,0,0,.18); background:white; color:#333; }
    .bl-btn--primary { background:#185FA5; color:#fff; border:none; }
    .bl-btn--primary:hover { opacity:.88; }

    /* Avatar */
    .bl-av { width:30px; height:30px; border-radius:50%; flex-shrink:0;
             display:flex; align-items:center; justify-content:center;
             font-size:11px; font-weight:600; color:white; }

    .bl-table-wrap { overflow-x:auto;
                     border:0.5px solid rgba(0,0,0,.09); border-radius:8px; }
    .bl-table { border-collapse:collapse; font-size:12px; min-width:100%; }
    .bl-th    { padding:8px 10px; font-weight:500; font-size:11px;
                background:#f8f8f8; color:#666;
                border-bottom:0.5px solid rgba(0,0,0,.08);
                text-align:center; white-space:nowrap; }
    .bl-td    { padding:8px 10px; border-bottom:0.5px solid rgba(0,0,0,.05);
                vertical-align:middle; }
    .bl-td--name   { font-weight:500; }
    .bl-td--center { text-align:center; }
    .bl-tr:last-child .bl-td { border-bottom:none; }
    .bl-tr:hover   .bl-td    { background:rgba(0,0,0,.012); }

    .bl-mention       { font-size:11px; padding:2px 7px; border-radius:99px; }
    .bl-mention--ok   { background:#EAF3DE; color:#27500A; }
    .bl-mention--info { background:#EBF3FC; color:#0C447C; }
    .bl-mention--warn { background:#FAEEDA; color:#633806; }
    .bl-mention--bad  { background:#FCEBEB; color:#791F1F; }
    .bl-mention--neu  { background:#f5f5f5; color:#555; }

    .bl-perm        { font-size:10px; padding:2px 6px; border-radius:4px;
                      background:#f0f0f0; color:#555; white-space:nowrap; }
    .bl-perm--admin { background:#0C447C; color:white; }
    .bl-perm--more  { background:#e8e8e8; color:#888; }

    .bl-icon-btn { width:28px; height:28px; border:0.5px solid rgba(0,0,0,.12);
                   background:white; cursor:pointer; border-radius:5px;
                   display:inline-flex; align-items:center;
                   justify-content:center; color:#555; }
    .bl-icon-btn:hover     { background:#EBF3FC; color:#185FA5;
                              border-color:#B5D4F4; }
    .bl-icon-btn--del:hover{ background:#FCEBEB; color:#A32D2D;
                              border-color:#F09595; }
  `],
})
export class UsersListComponent {
  private dialog = inject(MatDialog);
  private snack  = inject(MatSnackBar);
  private cdr    = inject(ChangeDetectorRef);
  private data   = inject(DataService);

  // En production : chargé depuis DataService.getUsers()
  users = signal<AppUser[]>(this.data.getUsers());

  nbActifs = computed(() => this.users().length);

  // ── Modal ─────────────────────────────────────────────────────────

  private _ouvrirModal(data: UserModalData): void {
    this.dialog.open(UserModalComponent, {
      data,
      width:    '520px',
      maxWidth: '96vw',
    }).afterClosed().subscribe((r: {
      success?: boolean;
      user?: AppUser;
      deleted?: boolean;
      userId?: string;
    } | undefined) => {
      if (!r) return;

      if (r.deleted && r.userId) {
        // Suppression
        this.users.update(list => list.filter(u => u.id !== r.userId));
        this.snack.open('Utilisateur supprimé', 'OK', { duration: 3000 });

      } else if (r.success && r.user) {
        // Upsert — remplace si existant, ajoute si nouveau
        this.users.update(list => {
          const idx = list.findIndex(u => u.id === r.user!.id);
          return idx === -1
            ? [...list, r.user!]
            : list.map((u, i) => i === idx ? r.user! : u);
        });
      }
      this.cdr.markForCheck();
    });
  }

  ouvrirCreation():                void { this._ouvrirModal({}); }
  ouvrirModification(u: AppUser):  void { this._ouvrirModal({ user: u }); }

  supprimer(u: AppUser): void {
    // Peut aussi ouvrir le modal en mode modification avec pre-confirmation
    this._ouvrirModal({ user: u });
  }

  // ── Helpers visuels ──────────────────────────────────────────────

  initiales(nom: string): string {
    return nom.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2);
  }

  private readonly _palette = [
    '#185FA5','#0F6E56','#6A1B9A','#C62828','#E65100','#00695C',
  ];
  avBg(id: string): string {
    const idx = [...id].reduce((s, c) => s + c.charCodeAt(0), 0)
      % this._palette.length;
    return this._palette[idx];
  }

  labelPerm(p: PermissionId): string {
    return PERMISSIONS.find(x => x.id === p)?.label ?? p;
  }

  roleLabel(role: string): string {
    const map: Record<string, string> = {
      admin: 'Admin', caissier: 'Caissier',
      enseignant: 'Enseignant', surveillant: 'Surveillant',
    };
    return map[role] ?? role;
  }

  roleCls(role: string): string {
    const map: Record<string, string> = {
      admin:       'bl-mention bl-mention--ok',
      caissier:    'bl-mention bl-mention--info',
      enseignant:  'bl-mention bl-mention--warn',
      surveillant: 'bl-mention bl-mention--neu',
    };
    return map[role] ?? 'bl-mention bl-mention--neu';
  }
}