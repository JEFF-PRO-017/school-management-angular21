// notification.service.ts — service global pour les toasts (snackbar Material)
// Centralise tous les messages de retour utilisateur
import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {

  private snack = inject(MatSnackBar);

  private defaults: MatSnackBarConfig = {
    duration:            3000,
    horizontalPosition: 'end',
    verticalPosition:   'bottom',
  };

  success(msg: string): void {
    this.snack.open(msg, 'OK', {
      ...this.defaults,
      panelClass: ['bg-success', 'text-white'],
    });
  }

  error(msg: string): void {
    this.snack.open(msg, 'Fermer', {
      ...this.defaults,
      duration:   6000,
      panelClass: ['bg-danger', 'text-white'],
    });
  }

  info(msg: string): void {
    this.snack.open(msg, '', this.defaults);
  }

  warn(msg: string): void {
    this.snack.open(msg, 'OK', {
      ...this.defaults,
      panelClass: ['bg-warning', 'text-dark'],
    });
  }
}
