// login.component.ts — écran de connexion redesigné
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { titleApp } from '../../../app.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  styles: [`
    .page { min-height:100vh; display:flex; align-items:center; justify-content:center;
            background:linear-gradient(135deg,#0f2a4a 0%,#185FA5 60%,#1a7fc1 100%);
            padding:16px; }

    .card { background:white; border-radius:16px; padding:36px 32px;
            width:100%; max-width:400px;
            box-shadow:0 20px 60px rgba(0,0,0,.25); }

    /* Logo */
    .logo { display:flex; flex-direction:column; align-items:center; gap:10px; margin-bottom:28px; }
    .logo-icon { width:56px; height:56px; background:#185FA5; border-radius:14px;
                 display:flex; align-items:center; justify-content:center; }
    .logo-title { font-size:20px; font-weight:600; color:#111; }
    .logo-sub   { font-size:12px; color:#aaa; margin-top:-6px; }

    /* Champs */
    .field       { display:flex; flex-direction:column; gap:4px; margin-bottom:14px; }
    .field label { font-size:12px; font-weight:500; color:#555; }
    .fi          { height:42px; padding:0 12px; font-size:14px;
                   border:1.5px solid rgba(0,0,0,.15); border-radius:8px;
                   background:white; outline:none; color:#333; width:100%;
                   transition:border-color .15s; }
    .fi:focus    { border-color:#185FA5; }
    .fi.err      { border-color:#dc3545; }
    .fi-wrap     { position:relative; }
    .fi-eye      { position:absolute; right:10px; top:50%; transform:translateY(-50%);
                   background:none; border:none; cursor:pointer; color:#999; padding:4px; }
    .hint        { font-size:11px; color:#dc3545; margin-top:2px; }

    /* Alerte erreur */
    .alert-err { background:#fff5f5; border:1px solid #fcc; border-radius:8px;
                 padding:10px 12px; font-size:12px; color:#c0392b; margin-bottom:14px; }

    /* Bouton submit */
    .btn-submit { width:100%; height:44px; background:#185FA5; color:white;
                  border:none; border-radius:8px; font-size:14px; font-weight:500;
                  cursor:pointer; display:flex; align-items:center; justify-content:center;
                  gap:8px; transition:opacity .15s; margin-top:4px; }
    .btn-submit:disabled { opacity:.5; cursor:default; }
    .btn-submit:not(:disabled):hover { opacity:.88; }

    /* Spinner */
    .spinner { width:16px; height:16px; border-radius:50%;
               border:2px solid rgba(255,255,255,.3); border-top-color:#fff;
               animation:sp .7s linear infinite; }
    @keyframes sp { to { transform:rotate(360deg); } }

    /* Footer */
    .footer { text-align:center; margin-top:20px; font-size:11px; color:#aaa; }
  `],
  template: `
<div class="page">
  <div class="card">

    <!-- Logo -->
    <div class="logo">
      <div class="logo-icon">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" stroke-width="1.5"
                stroke-linejoin="round"/>
          <path d="M2 17l10 5 10-5" stroke="white" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 12l10 5 10-5" stroke="white" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="logo-title">{{ titleApp }}</div>
      <div class="logo-sub">Connectez-vous pour continuer</div>
    </div>

    <form [formGroup]="form" (ngSubmit)="submit()">

      <!-- Identifiant -->
      <div class="field">
        <label for="username">Identifiant</label>
        <input id="username" class="fi"
               [class.err]="fc.username.invalid && fc.username.touched"
               formControlName="username"
               autocomplete="username"
               placeholder="Votre identifiant">
        @if (fc.username.invalid && fc.username.touched) {
          <div class="hint">Identifiant requis</div>
        }
      </div>

      <!-- Mot de passe -->
      <div class="field">
        <label for="password">Mot de passe</label>
        <div class="fi-wrap">
          <input id="password" class="fi"
                 [class.err]="fc.password.invalid && fc.password.touched"
                 [type]="showPwd() ? 'text' : 'password'"
                 formControlName="password"
                 autocomplete="current-password"
                 placeholder="••••••••"
                 style="padding-right:40px">
          <button type="button" class="fi-eye" (click)="showPwd.set(!showPwd())">
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
        </div>
        @if (fc.password.invalid && fc.password.touched) {
          <div class="hint">Mot de passe requis</div>
        }
      </div>

      <!-- Erreur connexion -->
      @if (error()) {
        <div class="alert-err">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
               style="vertical-align:middle;margin-right:5px">
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/>
            <path d="M8 5v4M8 10.5v.5" stroke="currentColor"
                  stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          {{ error() }}
        </div>
      }

      <button class="btn-submit" type="submit"
              [disabled]="form.invalid || loading()">
        @if (loading()) { <div class="spinner"></div> }
        {{ loading() ? 'Connexion…' : 'Se connecter' }}
      </button>

    </form>

    <div class="footer">CSB Berceau du Savoir — v1.0.0</div>

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

  async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');
    const ok = await this.auth.login(
      this.form.value.username!,
      this.form.value.password!
    );
    this.loading.set(false);
    if (ok) this.router.navigate(['/dashboard']);
    else this.error.set('Identifiant ou mot de passe incorrect.');
  }
}