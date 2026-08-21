// parent-login.component.ts — Connexion espace parent
// Mobile-first, connexion par numéro de téléphone
import {
    Component, inject, signal, ChangeDetectionStrategy
} from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ParentService } from '../../../core/services/parent.service';
import { titleApp } from '../../../app.component';

@Component({
    selector: 'app-parent-login',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule],
    styles: [`
    :host { display:flex; min-height:100dvh; background:#F0F4F8;
            align-items:center; justify-content:center; padding:16px; }

    .card { background:white; border-radius:20px; padding:36px 28px;
            max-width:400px; width:100%;
            box-shadow:0 4px 24px rgba(0,0,0,.08); }

    .logo { display:flex; flex-direction:column; align-items:center;
            gap:12px; margin-bottom:36px; }
    .logo-icon { width:64px; height:64px; background:#185FA5; border-radius:16px;
                  display:flex; align-items:center; justify-content:center; }
    .logo-titre { font-size:20px; font-weight:700; color:#111; }
    .logo-sous   { font-size:13px; color:#888; }

    .field { display:flex; flex-direction:column; gap:6px; margin-bottom:20px; }
    label  { font-size:13px; font-weight:500; color:#444; }
    .tel-wrap { display:flex; align-items:center;
                border:1.5px solid #D1D9E6; border-radius:12px;
                overflow:hidden; transition:border-color .15s; }
    .tel-wrap:focus-within { border-color:#185FA5; }
    .indicatif { padding:0 12px; font-size:14px; color:#555;
                 background:#F5F7FA; height:52px;
                 display:flex; align-items:center;
                 border-right:1px solid #D1D9E6; white-space:nowrap; }
    input[type=tel] { flex:1; height:52px; padding:0 16px; font-size:16px;
                      border:none; outline:none; color:#111; background:white; }

    .erreur { font-size:12px; color:#D32F2F; margin-top:4px; }

    .btn-login { width:100%; height:52px; background:#185FA5; color:white;
                  border:none; border-radius:12px; font-size:16px; font-weight:600;
                  cursor:pointer; display:flex; align-items:center;
                  justify-content:center; gap:8px; transition:opacity .15s; }
    .btn-login:disabled { opacity:.5; cursor:default; }
    .btn-login:not(:disabled):active { opacity:.85; }

    .spinner { width:20px; height:20px; border-radius:50%;
               border:2.5px solid rgba(255,255,255,.3);
               border-top-color:white;
               animation:spin .7s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }

    .lien-inscription { text-align:center; margin-top:24px;
                         font-size:13px; color:#888; }
    .lien-inscription a { color:#185FA5; font-weight:500;
                           text-decoration:none; cursor:pointer; }

    .bandeau-err { background:#FCEBEB; color:#791F1F; border-radius:10px;
                   padding:12px 16px; font-size:13px; margin-bottom:16px; }
  `],
    template: `
<div class="card">

  <div class="logo">
    <div class="logo-icon">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M16 4L4 10v8c0 5.5 5 10.5 12 13 7-2.5 12-7.5 12-13V10L16 4z"
              fill="white" fill-opacity=".2" stroke="white" stroke-width="1.5"
              stroke-linejoin="round"/>
        <circle cx="16" cy="14" r="4" fill="white"/>
        <path d="M9 24c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="white"
              stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </div>
    <div>
      <div class="logo-titre">Espace Parent</div>
      <div class="logo-sous">{{titleApp}}</div>
    </div>
  </div>

  @if (erreurMsg()) {
    <div class="bandeau-err">{{ erreurMsg() }}</div>
  }

  <div class="field">
    <label for="tel">Votre numéro de téléphone</label>
    <div class="tel-wrap">
      <div class="indicatif">🇨🇲 +237</div>
      <input id="tel" type="tel" [formControl]="ctrlTel"
             placeholder="6XXXXXXXX"
             inputmode="numeric"
             autocomplete="tel">
    </div>
    @if (ctrlTel.invalid && ctrlTel.touched) {
      <div class="erreur">Entrez un numéro valide (9 chiffres)</div>
    }
  </div>

  <button class="btn-login"
          (click)="seConnecter()"
          [disabled]="ctrlTel.invalid || chargement()">
    @if (chargement()) {
      <div class="spinner"></div>
      Connexion…
    } @else {
      Se connecter
    }
  </button>

  <div class="lien-inscription">
    Pas encore inscrit ?
    <a (click)="allerInscription()">Créer un compte</a>
  </div>

</div>
  `
})
export class ParentLoginComponent {

    private svc = inject(ParentService);
    private router = inject(Router);
    titleApp = titleApp

    chargement = this.svc.chargement;
    erreurMsg = signal<string | null>(null);

    ctrlTel = new FormControl('', [
        Validators.required,
        Validators.pattern(/^[0-9]{9}$/),
    ]);

    async seConnecter(): Promise<void> {
        this.ctrlTel.markAsTouched();
        if (this.ctrlTel.invalid) return;
        this.erreurMsg.set(null);

        const r = await this.svc.login(this.ctrlTel.value!);
        if (r === 'ok') {
            this.router.navigate(['/espace-parent/dashboard']);
        } else if (r === 'introuvable') {
            this.erreurMsg.set('Numéro non reconnu. Vérifiez ou inscrivez-vous.');
        } else {
            this.erreurMsg.set('Erreur réseau. Réessayez dans quelques secondes.');
        }
    }

    allerInscription(): void {
        this.router.navigate(['/espace-parent/inscription']);
    }
}