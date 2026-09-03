// notification-detail.component.ts
// Page "Détail d'une notification" — espace parent.
// Route : /espace-parent/notifications/:id
//
// - Marque automatiquement la notification comme lue (silencieux) à l'ouverture.
// - Navigation gestuelle : swipe gauche -> notification suivante,
//   swipe droite -> notification précédente (basé sur le même ordre trié
//   que la liste : urgentes non lues > non lues > lues).

import { Component, ChangeDetectionStrategy, OnInit, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NotifParent } from '../../../../core/models';
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
      <div class="container-fluid p-3" style="max-width:640px" #zoneSwipe>

        <div class="d-flex align-items-center gap-2 mb-3">
          <i class="bi fs-3" [class]="iconeDe(notification.type)"
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
                  [disabled]="!aPrecedente" (click)="allerPrecedente()">
            <i class="bi bi-chevron-left"></i> Précédent
          </button>
          <span class="text-muted small">{{ positionActuelle }} / {{ positionTotale }}</span>
          <button type="button" class="btn btn-outline-secondary btn-sm"
                  [disabled]="!aSuivante" (click)="allerSuivante()">
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
export class NotificationDetailComponent implements OnInit {
  notification?: NotifParent;

  aPrecedente = false;
  aSuivante = false;
  positionActuelle = 0;
  positionTotale = 0;

  private touchStartX = 0;
  private touchEndX = 0;
  private readonly seuilSwipe = 50; // px minimum pour considérer un swipe

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private notifService: NotifService,
  ) {
    // Recharge les données à chaque changement de :id (navigation entre notifications)
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.chargerNotification(id);
    });
  }

  ngOnInit(): void { }
  
  fil = computed(() => [
    { label: 'Mes Notifications', route: '/espace-parent/notifications' },
    { label: this.notification ? `${this.notification.titre ?? ''}`.trim() : 'Détail' },
  ]);


  private chargerNotification(id: string): void {
    this.notification = this.notifService.getById(id);
    if (!this.notification) return;

    if (!(this.notification.lue ?? false)) {
      // Marquage silencieux : pas de feedback visuel, pas de re-render de la liste ici.
      this.notifService.marquerCommeLue(id);
    }

    const index = this.notifService.getIndexTrie(id);
    const total = this.notifService.notificationsTriees().length;
    this.positionActuelle = index + 1;
    this.positionTotale = total;
    this.aPrecedente = !!this.notifService.getPrecedente(id);
    this.aSuivante = !!this.notifService.getSuivante(id);
  }

  allerPrecedente(): void {
    if (!this.notification) return;
    const precedente = this.notifService.getPrecedente(this.notification.id);
    if (precedente) this.router.navigate(['/espace-parent/notifications', precedente.id]);
  }

  allerSuivante(): void {
    if (!this.notification) return;
    const suivante = this.notifService.getSuivante(this.notification.id);
    if (suivante) this.router.navigate(['/espace-parent/notifications', suivante.id]);
  }

  iconeDe(type: NotifParent['type']): string {
    const icones: Record<NotifParent['type'], string> = {
      absence: 'bi-calendar-x',
      note: 'bi-journal-text',
      rdv: 'bi-calendar-event',
      paiement: 'bi-cash-coin',
      info: 'bi-info-circle',
    };
    return icones[type] ?? 'bi-bell';
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

    if (delta < 0) {
      // Glissement vers la gauche -> notification suivante
      this.allerSuivante();
    } else {
      // Glissement vers la droite -> notification précédente
      this.allerPrecedente();
    }
  }
}