import {
  Component, inject, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog }   from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AppUser, PERMISSIONS, PermissionId } from '../../../core/models/last_index';
import { UserModalData, UserModalComponent }   from '../modal/user-modal.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { GetServices } from '../../../core/services/@data';

@Component({
  selector: 'app-users-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PaginationComponent],
  template: `
<div class="d-flex flex-column gap-3">

  <!-- BARRE -->
  <div class="d-flex align-items-center flex-wrap gap-2 pb-2 border-bottom">

    <div class="d-flex flex-column">
      <span class="fw-semibold small">Gestion des utilisateurs</span>
      <span class="text-primary" style="font-size:11px">
        {{ filtres().length }} compte(s)
      </span>
    </div>

    <div class="vr"></div>

    <div class="input-group input-group-sm" style="width:220px">
      <span class="input-group-text bg-white">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <circle cx="6.5" cy="6.5" r="4.5" stroke="#aaa" stroke-width="1.3"/>
          <path d="M10 10l3 3" stroke="#aaa" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
      </span>
      <input class="form-control border-start-0"
             placeholder="Nom, login, rôle…"
             [(ngModel)]="recherche"
             (ngModelChange)="onRecherche()">
    </div>

    <span class="flex-grow-1"></span>

    <button class="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
            (click)="ouvrirCreation()">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      Nouvel utilisateur
    </button>
  </div>

  <!-- TABLEAU -->
  <div class="table-responsive border rounded">
    <table class="table table-sm table-hover align-middle mb-0">
      <thead class="table-light">
        <tr>
          <th>Utilisateur</th>
          <th class="text-center">Rôle</th>
          <th class="text-center">Section</th>
          <th>Permissions</th>
          <th class="text-center">Actions</th>
        </tr>
      </thead>
      <tbody>
        @if (page().length === 0) {
          <tr>
            <td colspan="5" class="text-center text-muted py-4 small">
              Aucun utilisateur trouvé.
            </td>
          </tr>
        }
        @for (u of page(); track u.id) {
          <tr>

            <!-- Nom + login -->
            <td>
              <div class="d-flex align-items-center gap-2">
                <span class="badge rounded-circle {{ avCls(u.id) }}"
                      style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:11px">
                  {{ initiales(u.nom) }}
                </span>
                <div>
                  <div class="fw-semibold small">{{ u.nom }}</div>
                  <div class="text-muted" style="font-size:10px"> {{'@'+ u.username }}</div>
                </div>
              </div>
            </td>

            <!-- Rôle -->
            <td class="text-center">
              <span class="badge {{ roleCls(u.role) }}">{{ roleLabel(u.role) }}</span>
            </td>

            <!-- Section -->
            <td class="text-center">
              <span class="badge bg-secondary-subtle text-secondary fw-normal">
                {{ u.section }}
              </span>
            </td>

            <!-- Permissions -->
            <td>
              @if (u.is_admin) {
                <span class="badge bg-primary">Accès complet</span>
              } @else {
                <div class="d-flex flex-wrap gap-1">
                  @for (p of u.permissions.slice(0, 5); track p) {
                    <span class="badge bg-light text-dark fw-normal border">{{ labelPerm(p) }}</span>
                  }
                  @if (u.permissions.length > 5) {
                    <span class="badge bg-light text-muted border">+{{ u.permissions.length - 5 }}</span>
                  }
                  @if (u.permissions.length === 0) {
                    <span class="text-muted small">Aucune</span>
                  }
                </div>
              }
            </td>

            <!-- Actions -->
            <td class="text-center">
              <div class="d-flex gap-1 justify-content-center">
                <button class="btn btn-sm btn-outline-secondary px-2 py-1"
                        title="Modifier" (click)="ouvrirModification(u)">
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                    <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor"
                          stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                @if (!u.is_admin) {
                  <button class="btn btn-sm btn-outline-danger px-2 py-1"
                          title="Supprimer" (click)="supprimer(u)">
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                      <path d="M3 5h10M6 5V3h4v2M6 8v4M10 8v4"
                            stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
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

  <!-- PAGINATION -->
  <app-pagination
    [total]="filtres().length"
    [pageSize]="pageSize"
    (pageChange)="onPageChange($event)">
  </app-pagination>

</div>
  `
})
export class UsersListComponent {
  private dialog = inject(MatDialog);
  private snack  = inject(MatSnackBar);
  private cdr    = inject(ChangeDetectorRef);
  private data   = inject(GetServices);

  readonly pageSize = 10;
  recherche = signal<string>('');

  users = signal<AppUser[]|any[]>(this.data.getUsers());

  private _debut = 0;
  private _fin   = this.pageSize;
  page = signal<AppUser[]>([]);

  filtres = computed(() => {
    const q = this.recherche().toLowerCase().trim();
    if (!q) return this.users();
    console.log('this.users()',this.users())
    return this.users().filter(u =>
      u.nom.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  onRecherche(): void {
    this._debut = 0;
    this._fin   = this.pageSize;
    this._updatePage();
  }

  onPageChange(e: { debut: number; fin: number }): void {
    this._debut = e.debut;
    this._fin   = e.fin;
    this._updatePage();
  }

  private _updatePage(): void {
    this.page.set(this.filtres().slice(this._debut, this._fin));
    this.cdr.markForCheck();
  }

  private _ouvrirModal(data: UserModalData): void {
    this.dialog.open(UserModalComponent, {
      data, width: '520px', maxWidth: '96vw',
    }).afterClosed().subscribe((r?: {
      success?: boolean; user?: AppUser;
      deleted?: boolean; userId?: string;
    }) => {
      if (!r) return;
      if (r.deleted && r.userId) {
        this.users.update(l => l.filter(u => u.id !== r.userId));
        this.snack.open('Utilisateur supprimé', 'OK', { duration: 3000 });
      } else if (r.success && r.user) {
        this.users.update(l => {
          const i = l.findIndex(u => u.id === r.user!.id);
          return i === -1 ? [...l, r.user!] : l.map((u, j) => j === i ? r.user! : u);
        });
      }
      this._updatePage();
    });
  }

  ouvrirCreation():               void { this._ouvrirModal({}); }
  ouvrirModification(u: AppUser): void { this._ouvrirModal({ user: u }); }
  supprimer(u: AppUser):          void { this._ouvrirModal({ user: u }); }

  initiales(nom: string): string {
    return nom.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2);
  }

  private readonly _avClasses = [
    'bg-primary', 'bg-success', 'bg-danger',
    'bg-warning text-dark', 'bg-info text-dark', 'bg-secondary',
  ];
  avCls(id: string): string {
    const i = [...id].reduce((s, c) => s + c.charCodeAt(0), 0) % this._avClasses.length;
    return this._avClasses[i];
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
      admin:       'bg-success',
      caissier:    'bg-primary',
      enseignant:  'bg-warning text-dark',
      surveillant: 'bg-secondary',
    };
    return map[role] ?? 'bg-secondary';
  }
}