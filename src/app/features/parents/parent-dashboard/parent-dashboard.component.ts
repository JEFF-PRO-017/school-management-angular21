// parent-dashboard.component.ts — Tableau de bord parent
// Mobile-first, cartes résumé, insolvable en rouge, notifications
import {
  Component, inject, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ParentService } from '../../../core/services/parent.service';


@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  styles: [`
    :host { display:block; min-height:100dvh; background:#F0F4F8;
            padding-bottom:24px; }

    /* ── Header ── */
    .header { background:#185FA5; color:white; padding:16px 20px 20px;
              position:sticky; top:0; z-index:100; }
    .header-top { display:flex; align-items:center; justify-content:space-between; }
    .header-nom { font-size:16px; font-weight:600; }
    .header-sous { font-size:12px; opacity:.8; margin-top:2px; }
    .header-actions { display:flex; align-items:center; gap:8px; }
    .btn-icon { width:36px; height:36px; border:none; border-radius:50%;
                background:rgba(255,255,255,.2); color:white; cursor:pointer;
                display:flex; align-items:center; justify-content:center; }
    .btn-icon:active { background:rgba(255,255,255,.35); }
    .badge-notif { position:absolute; top:-4px; right:-4px; width:16px; height:16px;
                   background:#EF4444; border-radius:50%; font-size:10px;
                   color:white; display:flex; align-items:center; justify-content:center;
                   font-weight:700; }
    .btn-icon-wrap { position:relative; }

    /* ── Bandeau insolvable ── */
    .bandeau-insolvable { background:#FEE2E2; border-left:4px solid #EF4444;
                           margin:12px 16px 0; border-radius:10px;
                           padding:12px 14px; font-size:13px; color:#7F1D1D; }
    .bandeau-insolvable strong { display:block; margin-bottom:2px; }

    /* ── Notifications ── */
    .notifs { margin:12px 16px 0; display:flex; flex-direction:column; gap:6px; }
    .notif { border-radius:10px; padding:10px 14px; font-size:13px;
             display:flex; gap:10px; align-items:flex-start; }
    .notif--absence  { background:#FEF3C7; color:#78350F; }
    .notif--note     { background:#ECFDF5; color:#064E3B; }
    .notif--paiement { background:#FEE2E2; color:#7F1D1D; }
    .notif--rdv      { background:#EEF2FF; color:#1E1B4B; }
    .notif--info     { background:#EBF3FC; color:#0C447C; }
    .notif-emoji { font-size:18px; flex-shrink:0; line-height:1.3; }
    .notif-texte { flex:1; }
    .notif-titre { font-weight:600; font-size:12px; }
    .notif-corps { font-size:12px; margin-top:2px; opacity:.85; }
    .notif-close { background:none; border:none; cursor:pointer;
                   opacity:.5; font-size:16px; padding:0; line-height:1; }

    /* ── Section titre ── */
    .section { margin:16px 16px 0; }
    .section-titre { font-size:11px; font-weight:600; color:#9CA3AF;
                     text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px; }

    /* ── Cartes résumé (2 colonnes) ── */
    .cartes { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .carte { background:white; border-radius:14px; padding:16px;
             box-shadow:0 1px 4px rgba(0,0,0,.06); cursor:pointer;
             transition:transform .1s; }
    .carte:active { transform:scale(.97); }
    .carte-icon { width:38px; height:38px; border-radius:10px;
                  display:flex; align-items:center; justify-content:center;
                  margin-bottom:10px; }
    .carte-icon--blue  { background:#EBF3FC; }
    .carte-icon--green { background:#DCFCE7; }
    .carte-icon--amber { background:#FEF3C7; }
    .carte-icon--red   { background:#FEE2E2; }
    .carte-val { font-size:22px; font-weight:700; color:#111; line-height:1; }
    .carte-lbl { font-size:11px; color:#9CA3AF; margin-top:4px; }

    /* ── Paiement ── */
    .carte-paiement { background:white; border-radius:14px; padding:18px;
                       box-shadow:0 1px 4px rgba(0,0,0,.06); }
    .carte-paiement--rouge { border:1.5px solid #EF4444; }
    .pai-row { display:flex; justify-content:space-between;
               align-items:center; margin-bottom:6px; }
    .pai-lbl  { font-size:13px; color:#555; }
    .pai-val  { font-size:13px; font-weight:600; color:#111; }
    .pai-val--vert  { color:#059669; }
    .pai-val--rouge { color:#DC2626; }
    .progress-track { height:10px; background:#E5E7EB; border-radius:99px;
                       overflow:hidden; margin:12px 0; }
    .progress-fill  { height:100%; border-radius:99px; transition:width .4s; }
    .progress-fill--vert  { background:linear-gradient(90deg,#10B981,#059669); }
    .progress-fill--amber { background:linear-gradient(90deg,#FBBF24,#D97706); }
    .progress-fill--rouge { background:linear-gradient(90deg,#F87171,#DC2626); }
    .pai-taux { text-align:right; font-size:11px; color:#9CA3AF; }
    .btn-payer { width:100%; height:44px; border:none; border-radius:10px;
                  background:#185FA5; color:white; font-size:14px; font-weight:600;
                  cursor:pointer; margin-top:12px; transition:opacity .15s; }
    .btn-payer:active { opacity:.85; }

    /* ── Élèves ── */
    .eleve-card { background:white; border-radius:14px; padding:16px;
                   box-shadow:0 1px 4px rgba(0,0,0,.06); margin-bottom:10px;
                   cursor:pointer; transition:transform .1s; }
    .eleve-card:active { transform:scale(.98); }
    .eleve-top { display:flex; align-items:center; gap:12px; }
    .eleve-av  { width:42px; height:42px; border-radius:50%; flex-shrink:0;
                  background:#EBF3FC; color:#185FA5;
                  display:flex; align-items:center; justify-content:center;
                  font-size:14px; font-weight:700; }
    .eleve-nom { font-size:15px; font-weight:600; color:#111; }
    .eleve-cls { font-size:12px; color:#9CA3AF; margin-top:1px; }
    .eleve-stats { display:grid; grid-template-columns:1fr 1fr 1fr;
                   gap:8px; margin-top:12px; }
    .stat { text-align:center; }
    .stat-val { font-size:17px; font-weight:700; color:#111; }
    .stat-lbl { font-size:10px; color:#9CA3AF; }
    .stat-val--ok  { color:#059669; }
    .stat-val--warn{ color:#D97706; }
    .stat-val--bad { color:#DC2626; }

    /* ── Refresh + Logout ── */
    .footer-bar { display:flex; justify-content:center; gap:12px;
                  margin:20px 16px 0; }
    .btn-refresh { flex:1; height:44px; border:1.5px solid #D1D9E6;
                   border-radius:10px; background:white; font-size:13px;
                   color:#555; cursor:pointer; display:flex;
                   align-items:center; justify-content:center; gap:6px; }
    .btn-logout  { flex:1; height:44px; border:1.5px solid #FCA5A5;
                   border-radius:10px; background:white; font-size:13px;
                   color:#DC2626; cursor:pointer; display:flex;
                   align-items:center; justify-content:center; gap:6px; }

    /* ── Spinner overlay ── */
    .spinner-overlay { position:fixed; inset:0; background:rgba(255,255,255,.7);
                        display:flex; align-items:center; justify-content:center;
                        z-index:200; }
    .spinner-ring { width:40px; height:40px; border-radius:50%;
                    border:4px solid #E5E7EB; border-top-color:#185FA5;
                    animation:spin .8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }

    .empty { text-align:center; padding:32px 16px; color:#9CA3AF; font-size:13px; }
  `],
  template: `
<div>

  @if (chargement()) {
    <div class="spinner-overlay"><div class="spinner-ring"></div></div>
  }

  <!-- ── Header ── -->
  <div class="header">
    <div class="header-top">
      <div>
        <div class="header-nom">Bonjour, {{ nomFamille() }}</div>
        <div class="header-sous">{{ dateAujourdhui() }}</div>
      </div>
      <div class="header-actions">

        <!-- Notifications -->
        <div class="btn-icon-wrap">
          <button class="btn-icon" (click)="allerNotifications()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 22c1.1 0 2-.9 2-2H10c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
                    fill="white"/>
            </svg>
          </button>
          @if (nbNotifs() > 0) {
            <div class="badge-notif">{{ nbNotifs() }}</div>
          }
        </div>

        <!-- Refresh -->
        <button class="btn-icon" (click)="rafraichir()" [disabled]="chargement()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
                  fill="white"/>
          </svg>
        </button>

      </div>
    </div>
  </div>

  <!-- ── Bandeau insolvable ── -->
  @if (insolvable()) {
    <div class="bandeau-insolvable">
      <strong>⚠️ Rendez-vous de paiement dépassé</strong>
      Votre solde est en retard. Contactez l'administration.
    </div>
  }

  <!-- ── Notifications urgentes ── -->
  @if (notifsUrgentes().length > 0) {
    <div class="notifs">
      @for (n of notifsUrgentes(); track n.id) {
        <div [class]="'notif notif--' + n.type">
          <div class="notif-emoji">{{ emojiNotif(n.type) }}</div>
          <div class="notif-texte">
            <div class="notif-titre">{{ n.titre }}</div>
            <div class="notif-corps">{{ n.corps }}</div>
          </div>
          <button class="notif-close" (click)="fermerNotif(n.id)">✕</button>
        </div>
      }
    </div>
  }

  <!-- ── Résumé 4 cartes ── -->
  <div class="section">
    <div class="section-titre">Résumé</div>
    <div class="cartes">

      <div class="carte" >
        <div class="carte-icon carte-icon--blue">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" fill="#185FA5"/>
          </svg>
        </div>
        <div class="carte-val">{{ moyTrimResume() }}</div>
        <div class="carte-lbl">Moy. trimestrielle</div>
      </div>

      <div class="carte" >
        <div class="carte-icon carte-icon--amber">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"
                  fill="#D97706"/>
          </svg>
        </div>
        <div class="carte-val" [class.stat-val--bad]="totalAbsences() >= 3">
          {{ totalAbsences() }}
        </div>
        <div class="carte-lbl">Absence(s)</div>
      </div>

      <div class="carte" [routerLink]="['/espace-parent/paiement']">
        <div class="carte-icon carte-icon--red">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"
                  fill="#DC2626"/>
          </svg>
        </div>
        <div class="carte-val" [class.stat-val--bad]="insolvable()">
          {{ restePaiement() }}
        </div>
        <div class="carte-lbl">Restant (FCFA)</div>
      </div>

      <div class="carte" [routerLink]="['/espace-parent/paiement']">
        <div class="carte-icon carte-icon--green">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"
                  fill="#059669"/>
          </svg>
        </div>
        <div class="carte-val">
          {{ prochainRdv() ?? '—' }}
        </div>
        <div class="carte-lbl">Prochain RDV</div>
      </div>

    </div>
  </div>

  <!-- ── Paiement résumé ── -->
  @if (paiement()) {
    <div class="section">
      <div class="section-titre">Pension</div>
      <div class="carte-paiement" [class.carte-paiement--rouge]="insolvable()">
        <div class="pai-row">
          <span class="pai-lbl">Total attendu</span>
          <span class="pai-val">{{ fcfa(paiement()!.montant_attendu) }} FCFA</span>
        </div>
        <div class="pai-row">
          <span class="pai-lbl">Payé</span>
          <span class="pai-val pai-val--vert">{{ fcfa(paiement()!.montant_paye) }} FCFA</span>
        </div>
        <div class="pai-row">
          <span class="pai-lbl">Reste à payer</span>
          <span [class]="paiement()!.reste_a_payer > 0 ? 'pai-val pai-val--rouge' : 'pai-val pai-val--vert'">
            {{ fcfa(paiement()!.reste_a_payer) }} FCFA
          </span>
        </div>
        <div class="progress-track">
          <div [class]="progressCls()"
               [style.width.%]="paiement()!.taux_paiement">
          </div>
        </div>
        <div class="pai-taux">{{ paiement()!.taux_paiement }}% payé</div>
        @if (paiement()!.reste_a_payer > 0) {
          <button class="btn-payer"
                  [routerLink]="['/espace-parent/paiement']">
            Initier un paiement
          </button>
        }
      </div>
    </div>
  }

  <!-- ── Élèves ── -->
  <div class="section">
    <div class="section-titre">Mes enfants ({{ eleves().length }})</div>

    @if (eleves().length === 0) {
      <div class="empty">Aucun enfant inscrit</div>
    } @else {
      @for (e of eleves(); track e.id_eleve) {
        <div class="eleve-card"
             [routerLink]="['/espace-parent/eleve', e.id_eleve]">
          <div class="eleve-top">
            <div class="eleve-av">
              {{ e.nom[0] }}{{ e.prenom[0] }}
            </div>
            <div>
              <div class="eleve-nom">{{ e.prenom }} {{ e.nom }}</div>
              <div class="eleve-cls">{{ e.nom_classe }} · {{ e.niveau }}</div>
            </div>
          </div>
          <div class="eleve-stats">
            <div class="stat">
              <div class="stat-val" [class]="moyenneCls(e.moy_trimestrielle)">
                {{ e.moy_trimestrielle !== null ? e.moy_trimestrielle.toFixed(1) : '—' }}
              </div>
              <div class="stat-lbl">Moyenne</div>
            </div>
            <div class="stat">
              <div class="stat-val" [class]="absencesCls(e.absences_count)">
                {{ e.absences_count }}
              </div>
              <div class="stat-lbl">Absences</div>
            </div>
            <div class="stat">
              <div class="stat-val">
                {{ e.rang !== null ? e.rang + '/' + e.effectif_classe : '—' }}
              </div>
              <div class="stat-lbl">Rang</div>
            </div>
          </div>
        </div>
      }
    }

    <!-- Ajouter un enfant -->
    <button class="btn-refresh" style="width:100%;margin-top:4px"
            [routerLink]="['/espace-parent/ajouter-enfant']">
      + Ajouter un enfant
    </button>
  </div>

  <!-- ── Footer actions ── -->
  <div class="footer-bar">
    <button class="btn-refresh" (click)="rafraichir()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
              fill="currentColor"/>
      </svg>
      Actualiser
    </button>
    <button class="btn-logout" (click)="logout()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"
              fill="currentColor"/>
      </svg>
      Déconnexion
    </button>
  </div>

</div>
  `
})
export class ParentDashboardComponent {

  private svc    = inject(ParentService);
  private router = inject(Router);
  private cdr    = inject(ChangeDetectorRef);

  chargement    = this.svc.chargement;
  eleves        = this.svc.eleves;
  paiement      = this.svc.paiement;
  insolvable    = this.svc.isInsolvable;
  nbNotifs      = this.svc.nbNotifNonLues;

  nomFamille = computed(() => this.svc.famille()?.nom_famille ?? 'Parent');

  notifsUrgentes = computed(() =>
    this.svc.notifications().filter((n: { urgente: any; type: string; }) => n.urgente || n.type === 'paiement')
  );

  moyTrimResume = computed(() => {
    const moys = this.eleves()
      .map((e:any) => e.moy_trimestrielle)
      .filter((m:any): m is number => m !== null);
    if (!moys.length) return '—';
    const moy = moys.reduce((a: any, b: any) => a + b, 0) / moys.length;
    return moy.toFixed(1);
  });

  totalAbsences = computed(() =>
    this.eleves().reduce((s: any, e: { absences_count: any; }) => s + e.absences_count, 0)
  );

  restePaiement = computed(() => {
    const p = this.paiement();
    return p ? this.fcfa(p.reste_a_payer) : '—';
  });

  prochainRdv = computed(() => {
    const rdv = this.paiement()?.prochain_rdv;
    if (!rdv) return null;
    try {
      return new Date(rdv).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' });
    } catch { return rdv; }
  });

  dateAujourdhui(): string {
    return new Date().toLocaleDateString('fr-FR',
      { weekday:'long', day:'2-digit', month:'long' });
  }

  async rafraichir(): Promise<void> {
    await this.svc.rafraichir();
    this.cdr.markForCheck();
  }

  logout(): void { this.svc.logout(); this.router.navigate(['/espace-parent/login']); }

  allerNotifications(): void { this.router.navigate(['/espace-parent/notifications']); }

  fermerNotif(id: string): void { this.svc.marquerLue(id); }

  emojiNotif(type: string): string {
    return { absence:'📅', note:'📊', paiement:'💰', rdv:'🗓️', info:'ℹ️' }[type] ?? '🔔';
  }

  progressCls(): string {
    const t = this.paiement()?.taux_paiement ?? 0;
    if (t >= 100) return 'progress-fill progress-fill--vert';
    if (t >= 50)  return 'progress-fill progress-fill--amber';
    return 'progress-fill progress-fill--rouge';
  }

  moyenneCls(m: number | null): string {
    if (m === null) return '';
    if (m >= 10) return 'stat-val--ok';
    if (m >= 8)  return 'stat-val--warn';
    return 'stat-val--bad';
  }

  absencesCls(n: number): string {
    if (n === 0) return 'stat-val--ok';
    if (n < 3)   return 'stat-val--warn';
    return 'stat-val--bad';
  }

  fcfa(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(n));
  }
}