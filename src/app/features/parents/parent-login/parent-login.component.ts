// parent-login.component.ts — Connexion espace parent
// Mobile-first, connexion par numéro de téléphone
// Style géré entièrement par Bootstrap (déjà installé dans le projet)
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
    // Aucun style en dur : uniquement des classes utilitaires Bootstrap
    template: `
<!-- Conteneur plein écran, centré verticalement et horizontalement -->
<div class="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">

  <!-- Colonne responsive : pleine largeur sur mobile, réduite sur grand écran -->
  <div class="row justify-content-center w-100">
    <div class="col-12 col-sm-8 col-md-6 col-lg-4">

      <div class="card shadow-sm border-0 rounded-4 p-4">

        <!-- Logo + titre de l'application -->
        <div class="d-flex flex-column align-items-center gap-2 mb-4">
          <div class="rounded-4 d-inline-flex align-items-center justify-content-center">
            <img src="assets/logo-csb.png"  width="70" height="70" viewBox="0 0 24 24" fill="none" alt="Logo" >
          </div>
          <div class="text-center">
            <div class="fw-bold fs-5">Espace Parent</div>
            <div class="small text-muted">{{ titleApp }}</div>
          </div>
        </div>

        <!-- Message d'erreur global (ex: numéro non reconnu, erreur réseau) -->
        @if (erreurMsg()) {
          <div class="alert alert-danger py-2 small mb-3">{{ erreurMsg() }}</div>
        }

        <!-- Champ téléphone -->
        <div class="mb-3">
          <label for="tel" class="form-label small">Votre numéro de téléphone</label>

          <!-- input-group Bootstrap : indicatif + numéro -->
          <div class="input-group has-validation">
            <span class="input-group-text">🇨🇲 +237</span>
            <input
              id="tel"
              type="tel"
              class="form-control"
              [class.is-invalid]="ctrlTel.invalid && ctrlTel.touched"
              [formControl]="ctrlTel"
              placeholder="6XXXXXXXX"
              inputmode="numeric"
              autocomplete="tel">
            <div class="invalid-feedback">
              Entrez un numéro valide (9 chiffres)
            </div>
          </div>
        </div>

        <!-- Bouton de connexion avec état de chargement -->
        <button
          class="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
          (click)="seConnecter()"
          [disabled]="ctrlTel.invalid || chargement()">
          @if (chargement()) {
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Connexion…
          } @else {
            Se connecter
          }
        </button>

        <!-- Lien vers l'inscription -->
        <div class="text-center small text-muted mt-3">
          Pas encore inscrit ?
          <a class="link-primary text-decoration-none" role="button" (click)="allerInscription()">
            Créer un compte
          </a>
        </div>

      </div>

      <!-- Accès admin discret : zone cliquable confortable, marqueur visuel discret -->
      <div class="text-center mt-3">
        <a class="d-inline-block p-2 text-decoration-none" role="button" (click)="allerAdmin()">
          <span class="d-inline-block rounded-circle bg-secondary" style="width:6px; height:6px;"></span>
        </a>
      </div>

    </div>
  </div>
</div>
  `
})
export class ParentLoginComponent {

    private svc = inject(ParentService);
    private router = inject(Router);
    titleApp = titleApp;

    chargement = this.svc.chargement;
    erreurMsg = signal<string | null>(null);

    // Numéro camerounais : exactement 9 chiffres après l'indicatif +237
    ctrlTel = new FormControl('', [
        Validators.required,
        Validators.pattern(/^[0-9]{9}$/),
    ]);

    // Tente la connexion et redirige ou affiche l'erreur correspondante
    async seConnecter(): Promise<void> {
        this.ctrlTel.markAsTouched();
        if (this.ctrlTel.invalid) return;
        this.erreurMsg.set(null);

        const r = await this.svc.login(this.ctrlTel.value!);
        if (r === 'ok') {
            this.router.navigate(['/espace-parent/dashboard']);
        } else if (r === 'introuvable') {
            this.erreurMsg.set('Numéro non reconnu. Vérifiez ou inscrivez-vous.');
        } else if (r === 'non-actif') {
            this.erreurMsg.set('Votre compte n’est pas actif. Contactez l’administrateur.');
        } else {
            this.erreurMsg.set('Erreur réseau. Réessayez dans quelques secondes.');
        }
    }

    allerInscription(): void {
        this.router.navigate(['/espace-parent/inscription']);
    }

    // Accès discret à la connexion admin (lien quasi invisible en bas de page)
    allerAdmin(): void {
        this.router.navigate(['/admin/login']);
    }
}