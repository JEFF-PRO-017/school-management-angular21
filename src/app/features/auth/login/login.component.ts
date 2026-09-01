// login.component.ts — écran de connexion admin
// Style entièrement géré par Bootstrap (déjà installé dans le projet)
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { titleApp } from '../../../app.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  // Aucun style en dur : uniquement des classes utilitaires Bootstrap
  template: `
<!-- Fond dégradé + centrage plein écran -->
<div class="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-primary bg-gradient p-3">

  <!-- Colonne responsive -->
  <div class="row justify-content-center w-100">
    <div class="col-12 col-sm-8 col-md-6 col-lg-4">

      <div class="card shadow-lg border-0 rounded-4 p-4">

        <!-- Logo + titre -->
        <div class="d-flex flex-column align-items-center gap-2 mb-4">
          <div class=" rounded-3 d-inline-flex align-items-center justify-content-center p-3">
            <img src="assets/logo-csb.png"  width="70" height="70" viewBox="0 0 24 24" fill="none" alt="Logo" >
          </div>
          <div class="text-center">
            <div class="fw-semibold fs-5">{{ titleApp }}</div>
            <div class="small text-muted">Connectez-vous pour continuer</div>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()">

          <!-- Identifiant -->
          <div class="mb-3">
            <label for="username" class="form-label small">Identifiant</label>
            <input id="username"
                   class="form-control"
                   [class.is-invalid]="fc.username.invalid && fc.username.touched"
                   formControlName="username"
                   autocomplete="username"
                   placeholder="Votre identifiant">
            <div class="invalid-feedback">Identifiant requis</div>
          </div>

          <!-- Mot de passe avec bouton afficher/masquer -->
          <div class="mb-3">
            <label for="password" class="form-label small">Mot de passe</label>
            <div class="input-group has-validation">
              <input id="password"
                     class="form-control"
                     [class.is-invalid]="fc.password.invalid && fc.password.touched"
                     [type]="showPwd() ? 'text' : 'password'"
                     formControlName="password"
                     autocomplete="current-password"
                     placeholder="••••••••">
              <button type="button" class="btn btn-outline-secondary"
                      (click)="showPwd.set(!showPwd())"
                      [attr.aria-label]="showPwd() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'">
                @if (showPwd()) {
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.3"/>
                    <circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.3"/>
                    <path d="M2 2l12 12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                  </svg>
                } @else {
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.3"/>
                    <circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.3"/>
                  </svg>
                }
              </button>
              <div class="invalid-feedback">Mot de passe requis</div>
            </div>
          </div>

          <!-- Erreur de connexion -->
          @if (error()) {
            <div class="alert alert-danger py-2 small d-flex align-items-center gap-2 mb-3">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" class="flex-shrink-0">
                <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/>
                <path d="M8 5v4M8 10.5v.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
              {{ error() }}
            </div>
          }

          <!-- Bouton de connexion -->
          <button class="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
                  type="submit"
                  [disabled]="form.invalid || loading()">
            @if (loading()) {
              <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            }
            {{ loading() ? 'Connexion…' : 'Se connecter' }}
          </button>

        </form>

        <!-- Lien de retour vers l'espace parent -->
        <div class="text-center small mt-3">
          <a class="link-secondary text-decoration-none" role="button" (click)="allerParent()">
            ← Retour à l'espace parent
          </a>
        </div>

      </div>

      <div class="text-center small text-white-50 mt-3">CSB Berceau du Savoir — v1.0.0</div>

    </div>
  </div>
</div>
  `
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  form = new FormGroup({
    username: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required),
  });
  titleApp = titleApp;
  get fc() { return this.form.controls; }

  showPwd = signal(false);
  loading = signal(false);
  error = signal('');

  // Envoie les identifiants et redirige vers le dashboard, ou affiche l'erreur
  async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');
    const ok = await this.auth.login(
      this.form.value.username!,
      this.form.value.password!
    );

    this.loading.set(false);
    
    if (ok === 'success') this.router.navigate(['/dashboard']);
    else if (ok === 'incorrect') {
      this.error.set('Identifiant ou mot de passe incorrect.');
    } else if (ok === 'non-actif') {
      this.error.set('Votre compte n’est pas actif. Contactez l’administrateur.')
    } else {
      this.error.set('Erreur réseau. Réessayez dans quelques secondes.');
    }
  }

  // Retour vers la connexion parent
  allerParent(): void {
    this.router.navigate(['/espace-parent/login']);
  }
}