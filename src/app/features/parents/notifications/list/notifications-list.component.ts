// notifications-list.component.ts
// Page "Liste des notifications" — espace parent.
// Lecture : ParentService.famille()?.notifications (TOUTES, pas seulement les non lues
// exposées par ParentService.notifications() qui sert aux badges/compteurs ailleurs).
// Tri (urgentes non lues > non lues > lues) : NotifService.trierParPriorite (métier pur).

import { Component, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotifParent } from '../../../../core/models';
import { ParentService } from '../../../../core/services';
import { ParentHeaderComponent } from '../../components/parent-header.component';
import { ParentNavbarComponent } from '../../components/parent-navbar.component';
import { NotifService } from '../notif.service';



@Component({
  selector: 'app-notifications-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ParentHeaderComponent, ParentNavbarComponent],
  template: `
    <app-parent-header titre="Notifications"></app-parent-header>
    <app-parent-navbar></app-parent-navbar>

    <div class="container-fluid p-3">

      <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
        <select class="form-select form-select-sm" style="max-width:180px"
                [value]="filtreType()" (change)="onFiltreType($event)">
          <option value="">Tous les types</option>
          <option value="absence">Absence</option>
          <option value="note">Note</option>
          <option value="rdv">Rendez-vous</option>
          <option value="paiement">Paiement</option>
          <option value="info">Info</option>
        </select>

        <select class="form-select form-select-sm" style="max-width:180px"
                [value]="filtreLecture()" (change)="onFiltreLecture($event)">
          <option value="">Toutes</option>
          <option value="non_lue">Non lues</option>
          <option value="lue">Lues</option>
        </select>
      </div>

      @if (notifications().length === 0) {
        <div class="text-center text-muted py-5">Aucune notification</div>
      } @else {
        <div class="list-group">
          @for (n of notifications(); track n.id) {
            <button
              type="button"
              class="list-group-item list-group-item-action d-flex align-items-start gap-3 py-3"
              [class.border-start]="n.urgente"
              [class.border-danger]="n.urgente"
              [class.border-3]="n.urgente"
              [class.bg-light]="!n.lue"
              (click)="onOuvrir(n)">

              <i class="bi fs-5" [class]="notifService.iconeDe(n.type)"
                 [class.text-danger]="n.urgente"
                 [class.text-secondary]="!n.urgente"></i>

              <div class="flex-grow-1 text-start">
                <div class="d-flex align-items-center gap-2">
                  <span [class.fw-bold]="!n.lue">{{ n.titre || 'Notification' }}</span>
                  @if (n.urgente) {
                    <span class="badge bg-danger">Urgent</span>
                  }
                  @if (!n.lue) {
                    <span class="badge bg-primary rounded-pill">●</span>
                  }
                </div>
                <div class="small text-muted text-truncate">{{ n.corps || '—' }}</div>
                <div class="small text-muted">{{ (n.date | date: 'dd/MM/yyyy HH:mm') || 'Date inconnue' }}</div>
              </div>
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class NotificationsListComponent {
  filtreType = signal<string>('');
  filtreLecture = signal<string>('');

  /** Lecture centralisée + tri métier : aucune donnée gérée localement ici. */
  private toutesNotifications = computed(() =>
    this.notifService.trierParPriorite(this.parentService.famille()?.notifications ?? [])
  );

  notifications = computed(() => {
    const type = this.filtreType();
    const lecture = this.filtreLecture();
    return this.toutesNotifications().filter(n =>
      (!type || n.type === type) &&
      (!lecture || (lecture === 'lue' ? (n.lue ?? false) : !(n.lue ?? false)))
    );
  });

  constructor(
    private parentService: ParentService,
    protected notifService: NotifService,
    private router: Router,
  ) {}

  onFiltreType(e: Event): void {
    this.filtreType.set((e.target as HTMLSelectElement).value);
  }

  onFiltreLecture(e: Event): void {
    this.filtreLecture.set((e.target as HTMLSelectElement).value);
  }

  onOuvrir(n: NotifParent): void {
    this.router.navigate(['/espace-parent/notifications', n.id]);
  }
}