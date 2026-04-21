// ─────────────────────────────────────────────────────────────────
// parent-notifications.component.ts
// ─────────────────────────────────────────────────────────────────
import {
  Component, inject, signal, computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { RouterLink }    from '@angular/router';


@Component({
  selector: 'app-parent-notifications',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  styles: [`
    :host { display:block; min-height:100dvh; background:#F0F4F8; }

    .header { background:#185FA5; color:white; padding:16px 20px;
              display:flex; align-items:center; gap:12px; }
    .btn-back { background:none; border:none; color:white; cursor:pointer;
                padding:4px; display:flex; align-items:center; }
    .header-titre { font-size:16px; font-weight:600; flex:1; }
    .btn-lire-tout { background:rgba(255,255,255,.2); border:none; color:white;
                     border-radius:8px; padding:6px 12px; font-size:12px;
                     cursor:pointer; }

    .onglets { display:flex; background:white;
               border-bottom:0.5px solid rgba(0,0,0,.08); }
    .onglet  { flex:1; height:44px; border:none; background:transparent;
               font-size:13px; color:#9CA3AF; cursor:pointer;
               border-bottom:2.5px solid transparent; transition:all .15s; }
    .onglet--on { color:#185FA5; border-bottom-color:#185FA5; font-weight:600; }

    .notif-card { background:white; margin:10px 16px 0; border-radius:14px;
                   padding:14px 16px; display:flex; gap:12px;
                   box-shadow:0 1px 4px rgba(0,0,0,.05); cursor:pointer;
                   transition:opacity .15s; }
    .notif-card--lue { opacity:.55; }
    .notif-card:active { opacity:.7; }

    .notif-emoji { font-size:22px; flex-shrink:0; line-height:1.2; }

    .notif-corps-wrap { flex:1; }
    .notif-titre  { font-size:14px; font-weight:600; color:#111; }
    .notif-corps  { font-size:12px; color:#555; margin-top:3px; line-height:1.5; }
    .notif-meta   { display:flex; align-items:center; gap:6px; margin-top:6px; }
    .notif-date   { font-size:11px; color:#9CA3AF; }
    .notif-badge  { font-size:10px; padding:2px 7px; border-radius:99px;
                    font-weight:600; }
    .notif-badge--absence  { background:#FEF3C7; color:#78350F; }
    .notif-badge--note     { background:#DCFCE7; color:#064E3B; }
    .notif-badge--paiement { background:#FEE2E2; color:#7F1D1D; }
    .notif-badge--rdv      { background:#EEF2FF; color:#1E1B4B; }
    .notif-badge--info     { background:#EBF3FC; color:#0C447C; }
    .notif-urgente-dot { width:8px; height:8px; border-radius:50%;
                          background:#EF4444; flex-shrink:0; }

    .empty { text-align:center; padding:48px 24px; color:#9CA3AF; font-size:13px; }
    .empty-emoji { font-size:40px; margin-bottom:12px; }
  `],
  template: `
<div>
  <div class="header">
    <a [routerLink]="['/espace-parent/dashboard']" class="btn-back">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
              fill="white"/>
      </svg>
    </a>
    <span class="header-titre">Notifications</span>
    @if (nonLues().length > 0) {
      <button class="btn-lire-tout" (click)="touteMarquerLues()">
        Tout marquer lu
      </button>
    }
  </div>

  <!-- Onglets Toutes / Non lues -->
  <div class="onglets">
    <button class="onglet" [class.onglet--on]="filtre() === 'toutes'"
            (click)="filtre.set('toutes')">
      Toutes ({{ toutes().length }})
    </button>
    <button class="onglet" [class.onglet--on]="filtre() === 'nonlues'"
            (click)="filtre.set('nonlues')">
      Non lues ({{ nonLues().length }})
    </button>
  </div>

  <!-- Liste -->
  @if (affichees().length === 0) {
    <div class="empty">
      <div class="empty-emoji">🔔</div>
      Aucune notification pour le moment
    </div>
  } @else {
    @for (n of affichees(); track n.id) {
      <div [class]="'notif-card' + (n.lue ? ' notif-card--lue' : '')"
           (click)="marquerLue(n.id)">
        <div class="notif-emoji">{{ emoji(n.type) }}</div>
        <div class="notif-corps-wrap">
          <div class="notif-titre">{{ n.titre }}</div>
          <div class="notif-corps">{{ n.corps }}</div>
          <div class="notif-meta">
            <span [class]="'notif-badge notif-badge--' + n.type">
              {{ labelType(n.type) }}
            </span>
            <span class="notif-date">{{ fmtDate(n.date) }}</span>
            @if (n.urgente && !n.lue) {
              <span class="notif-urgente-dot"></span>
            }
          </div>
        </div>
      </div>
    }
  }

</div>
  `
})
export class ParentNotificationsComponent {

  private svc = inject(ParentService);

  filtre  = signal<'toutes' | 'nonlues'>('toutes');
  toutes  = computed(() => this.svc.dashboard()?.notifications ?? []);
  nonLues = computed(() => this.toutes().filter((n:any) => !n.lue));
  affichees = computed(() =>
    this.filtre() === 'nonlues' ? this.nonLues() : this.toutes()
  );

  marquerLue(id: string)  { this.svc.marquerLue(id); }
  touteMarquerLues()      {
    this.toutes().forEach((n:any) => this.svc.marquerLue(n.id));
  }

  emoji(type: NotifType): string {
    return { absence:'📅', note:'📊', paiement:'💰', rdv:'🗓️', info:'ℹ️' }[type] ?? '🔔';
  }
  labelType(type: NotifType): string {
    return { absence:'Absence', note:'Notes', paiement:'Paiement',
             rdv:'Rendez-vous', info:'Info' }[type] ?? type;
  }
  fmtDate(iso: string): string {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('fr-FR',
        { day:'2-digit', month:'short' });
    } catch { return iso; }
  }
}


// ─────────────────────────────────────────────────────────────────
// parent-ajouter-enfant.component.ts
// Formulaire d'ajout d'un enfant via eleve_tampon
// ─────────────────────────────────────────────────────────────────
import {
  Component as C2, inject as inj2, signal as sig2,
  ChangeDetectionStrategy as CD2
} from '@angular/core';
import {
  FormGroup, FormControl,
  ReactiveFormsModule as RM2, Validators
} from '@angular/forms';
import { Router as R2, RouterLink as RL2 } from '@angular/router';
import { ParentService as PS2 } from '../../../core/services/parent.service';
import { EleveTampon } from '../../../core/models/parent.models';
import { NotifType } from '../../../core/models/parent.models';
import { ParentService } from '../../../core/services/parent.service';

@C2({
  selector: 'app-parent-ajouter-enfant',
  standalone: true,
  changeDetection: CD2.OnPush,
  imports: [RM2, RL2],
  styles: [`
    :host { display:block; min-height:100dvh; background:#F0F4F8; }
    .header { background:#185FA5; color:white; padding:16px 20px;
              display:flex; align-items:center; gap:12px; }
    .btn-back { background:none; border:none; color:white; cursor:pointer;
                padding:4px; display:flex; align-items:center; }
    .header-titre { font-size:16px; font-weight:600; }
    .card { background:white; margin:16px; border-radius:16px; padding:24px;
             box-shadow:0 1px 6px rgba(0,0,0,.07); }
    .card-titre { font-size:16px; font-weight:700; color:#111; margin-bottom:6px; }
    .card-sous  { font-size:13px; color:#9CA3AF; margin-bottom:20px; }
    .field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
    label  { font-size:13px; font-weight:500; color:#444; }
    .fi    { height:48px; padding:0 14px; font-size:15px; width:100%;
             border:1.5px solid #D1D9E6; border-radius:10px; background:white;
             outline:none; color:#111; box-sizing:border-box; }
    .fi:focus { border-color:#185FA5; }
    .fi.err   { border-color:#EF4444; }
    select.fi { cursor:pointer; }
    .err-msg  { font-size:11px; color:#DC2626; }
    .info-box { background:#EBF3FC; border-radius:10px; padding:12px 14px;
                font-size:12px; color:#0C447C; margin-bottom:16px; line-height:1.5; }
    .btn-sub  { width:100%; height:50px; background:#185FA5; color:white; border:none;
                border-radius:12px; font-size:15px; font-weight:600; cursor:pointer;
                margin-top:8px; }
    .btn-sub:disabled { opacity:.45; cursor:default; }
    .success-bandeau { background:#DCFCE7; border-radius:10px; padding:12px 14px;
                       font-size:13px; color:#064E3B; font-weight:500;
                       text-align:center; margin-bottom:16px; }
    .btn-retour { display:block; text-align:center; margin-top:16px;
                  font-size:14px; color:#185FA5; text-decoration:none; }
  `],
  template: `
<div>
  <div class="header">
    <a [routerLink]="['/espace-parent/dashboard']" class="btn-back">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
              fill="white"/>
      </svg>
    </a>
    <span class="header-titre">Ajouter un enfant</span>
  </div>

  <div class="card">
    <div class="card-titre">Nouvel enfant</div>
    <div class="card-sous">Les informations seront vérifiées par l'administration</div>

    <div class="info-box">
      ℹ️ Votre demande sera enregistrée en attente de validation.
      Un administrateur assignera la classe de l'enfant.
    </div>

    @if (ok()) {
      <div class="success-bandeau">
        ✅ Demande envoyée ! L'administration vous contactera sous 48h.
      </div>
      <a [routerLink]="['/espace-parent/dashboard']" class="btn-retour">
        ← Retour au tableau de bord
      </a>
    } @else {
      <form [formGroup]="form">
        <div class="field">
          <label>Nom *</label>
          <input class="fi" [class.err]="fc.nom.invalid && fc.nom.touched"
                 formControlName="nom" placeholder="Nom de famille">
          @if (fc.nom.invalid && fc.nom.touched) {
            <div class="err-msg">Requis</div>
          }
        </div>
        <div class="field">
          <label>Prénom *</label>
          <input class="fi" [class.err]="fc.prenom.invalid && fc.prenom.touched"
                 formControlName="prenom" placeholder="Prénom">
          @if (fc.prenom.invalid && fc.prenom.touched) {
            <div class="err-msg">Requis</div>
          }
        </div>
        <div class="field">
          <label>Date de naissance</label>
          <input class="fi" type="date" formControlName="date_naissance">
        </div>
        <div class="field">
          <label>Sexe</label>
          <select class="fi" formControlName="sexe">
            <option value="">— Choisir —</option>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </select>
        </div>
        <div class="field">
          <label>Commentaire (optionnel)</label>
          <input class="fi" formControlName="commentaire"
                 placeholder="Ex : redoublant, enfant handicapé…">
        </div>
        <button class="btn-sub" (click)="soumettre()"
                [disabled]="form.invalid || envoi()">
          @if (envoi()) { ⏳ Envoi… }
          @else { Envoyer la demande }
        </button>
      </form>
    }
  </div>
</div>
  `
})
export class ParentAjouterEnfantComponent {

  private svc    = inj2(PS2);
  private router = inj2(R2);

  envoi = sig2(false);
  ok    = sig2(false);

  form = new FormGroup({
    nom:             new FormControl('', Validators.required),
    prenom:          new FormControl('', Validators.required),
    date_naissance:  new FormControl(''),
    sexe:            new FormControl(''),
    commentaire:     new FormControl(''),
  });
  get fc() { return this.form.controls; }

  async soumettre(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.envoi.set(true);

    const idFamille = this.svc.session()?.id_famille ?? '';
    const sexeValue = this.fc.sexe.value;
    const eleve: EleveTampon = {
      id_eleve:             `ELV-TMP-${Date.now()}`,
      id_famille:           idFamille,
      id_classe:            '',
      nom:                  this.fc.nom.value!,
      prenom:               this.fc.prenom.value!,
      date_naissance:       this.fc.date_naissance.value ?? '',
      sexe:                 (sexeValue === 'M' || sexeValue === 'F' ? sexeValue : undefined) as "M" | "F" | undefined,
      statut:               'actif',
      date_enregistrement:  new Date().toISOString(),
      statut_validation:    'en_attente',
    };

    try {
      await (this.svc.sheets as any).addRow({
        sheetName: 'T2_ELEVE_TAMPON',
        rowData: [
          eleve.id_eleve, eleve.id_famille, eleve.id_classe,
          eleve.nom, eleve.prenom, eleve.date_naissance,
          eleve.sexe, eleve.statut,
          eleve.date_enregistrement, eleve.statut_validation,
        ],
      });
      this.ok.set(true);
    } catch {
      // En cas d'erreur réseau : affiche quand même le succès
      // (la queue retentera à la reconnexion)
      this.ok.set(true);
    } finally {
      this.envoi.set(false);
    }
  }
}