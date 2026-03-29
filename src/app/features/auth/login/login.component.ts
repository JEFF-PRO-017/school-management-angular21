// login.component.ts — écran de connexion responsive
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule,
  ],
  template: `
    <!-- Centré verticalement, responsive mobile/tablette -->
    <div class="min-vh-100 d-flex align-items-center justify-content-center bg-light px-3">
      <div class="card shadow-sm border-0 w-100" style="max-width:420px">
        <div class="card-body p-4">

          <!-- Logo + titre -->
          <div class="text-center mb-4">
            <mat-icon style="font-size:48px;width:48px;height:48px" color="primary">
              school
            </mat-icon>
            <h5 class="mt-2 fw-bold text-primary">Gestion Scolaire</h5>
            <p class="text-muted small">Connectez-vous pour continuer</p>
          </div>

          <!-- Formulaire -->
          <form [formGroup]="form" (ngSubmit)="submit()">

            <mat-form-field class="w-100 mb-3" appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email">
              <mat-icon matSuffix>email</mat-icon>
              @if (form.controls.email.invalid && form.controls.email.touched) {
                <mat-error>Email invalide</mat-error>
              }
            </mat-form-field>

            <mat-form-field class="w-100 mb-3" appearance="outline">
              <mat-label>Mot de passe</mat-label>
              <input matInput [type]="showPwd() ? 'text' : 'password'"
                     formControlName="password" autocomplete="current-password">
              <button mat-icon-button matSuffix type="button"
                      (click)="showPwd.set(!showPwd())">
                <mat-icon>{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.controls.password.invalid && form.controls.password.touched) {
                <mat-error>Mot de passe requis</mat-error>
              }
            </mat-form-field>

            <!-- Message d'erreur de connexion -->
            @if (error()) {
              <div class="alert alert-danger py-2 small">
                {{ error() }}
              </div>
            }

            <!-- Bouton de connexion -->
            <button mat-raised-button color="primary"
                    class="w-100 py-2" type="submit"
                    [disabled]="form.invalid || loading()">
              @if (loading()) {
                <mat-spinner diameter="20" class="d-inline-block me-2"></mat-spinner>
              }
              Connexion
            </button>

          </form>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {

  private auth   = inject(AuthService);
  private router = inject(Router);

  // Formulaire réactif avec validation
  form = new FormGroup({
    email:    new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', Validators.required),
  });

  showPwd = signal(false);
  loading = signal(false);
  error   = signal('');

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');

    const { email, password } = this.form.value;
    const ok = this.auth.login(email!, password!);

    this.loading.set(false);
    if (ok) {
      this.router.navigate(['/dashboard']);
    } else {
      this.error.set('Email ou mot de passe incorrect.');
    }
  }
}
