// notification-detail.component.ts
// Page "Détail d'une notification" — espace parent.
// Route : /espace-parent/notifications/:id
//
// Lecture : ParentService.famille()?.notifications.
// Marquage "lu" : ParentService.marquerLue(id) — méthode déjà réelle, non dupliquée ici.
// Navigation swipe : NotifService.trouverVoisins (métier pur, sur la même liste triée que la page liste).

import { Component, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NotifParent } from '../../../../core/models';
import { ParentService } from '../../../../core/services';
import { BreadcrumbComponent } from '../../components/breadcrumb.component';
import { ParentHeaderComponent } from '../../components/parent-header.component';
import { NotifService } from '../notif.service';



@Component({
  selector: 'app-notification-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ParentHeaderComponent, BreadcrumbComponent],
  template: `
    <app-parent-header titre="Notification"></app-parent-header>
    <app-breadcrumb [items]="fil()"></app-breadcrumb>

    @if (notification) {
      <div class="container-fluid p-3" style="max-width:640px">

        <div class="d-flex align-items-center gap-2 mb-3">
          <i class="bi fs-3" [class]="notifService.iconeDe(notification.type)"
             [class.text-danger]="notification.urgente"
             [class.text-secondary]="!notification.urgente"></i>
          @if (notification.urgente) {
            <span class="badge bg-danger">Urgent</span>
          }
          <span class="badge bg-light text-dark text-capitalize">{{ notification.type }}</span>
        </div>

        <h5 class="fw-semibold">{{ notification.titre || 'Notification' }}</h5>
        <div class="text-muted small mb-3">{{ (notification.date | date: 'dd/MM/yyyy à HH:mm') || 'Date inconnue' }}</div>

        <p class="mb-4" style="white-space:pre-wrap">{{ notification.corps || 'Aucun contenu.' }}</p>

        <div class="d-flex justify-content-between align-items-center border-top pt-3">
          <button type="button" class="btn btn-outline-secondary btn-sm"
                  [disabled]="!voisins.precedente" (click)="allerVers(voisins.precedente)">
            <i class="bi bi-chevron-left"></i> Précédent
          </button>
          <span class="text-muted small">{{ voisins.index + 1 }} / {{ voisins.total }}</span>
          <button type="button" class="btn btn-outline-secondary btn-sm"
                  [disabled]="!voisins.suivante" (click)="allerVers(voisins.suivante)">
            Suivant <i class="bi bi-chevron-right"></i>
          </button>
        </div>

        <div class="text-center text-muted small mt-2 d-md-none">
          Glissez à gauche ou à droite pour naviguer
        </div>
      </div>
    } @else {
      <div class="text-center text-muted py-5">Notification introuvable</div>
    }
  `,
})
export class NotificationDetailComponent {
  notification?: NotifParent;
  voisins: { index: number; total: number; precedente?: NotifParent; suivante?: NotifParent } =
    { index: -1, total: 0 };

  private touchStartX = 0;
  private touchEndX = 0;
  private readonly seuilSwipe = 50;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private parentService: ParentService,
    protected notifService: NotifService,
  ) {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.chargerNotification(id);
    });
  }

  private chargerNotification(id: string): void {
    const listeTriee = this.notifService.trierParPriorite(this.parentService.famille()?.notifications ?? []);
    this.notification = listeTriee.find(n => n.id === id);
    if (!this.notification) return;

    if (!(this.notification.lue ?? false)) {
      // Marquage silencieux via la méthode déjà réelle de ParentService.
      this.parentService.marquerLue(id);
    }

    this.voisins = this.notifService.trouverVoisins(listeTriee, id);
  }

  fil() {
    return [
      { label: 'Notifications', route: '/espace-parent/notifications' },
      { label: this.notification?.titre || 'Détail' },
    ];
  }

  allerVers(n?: NotifParent): void {
    if (n) this.router.navigate(['/espace-parent/notifications', n.id]);
  }

  // ── Navigation gestuelle (swipe) ─────────────────────────────
  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent): void {
    this.touchStartX = e.changedTouches[0].screenX;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(e: TouchEvent): void {
    this.touchEndX = e.changedTouches[0].screenX;
    this.traiterSwipe();
  }

  private traiterSwipe(): void {
    const delta = this.touchEndX - this.touchStartX;
    if (Math.abs(delta) < this.seuilSwipe) return;
    if (delta < 0) this.allerVers(this.voisins.suivante);
    else this.allerVers(this.voisins.precedente);
  }
}