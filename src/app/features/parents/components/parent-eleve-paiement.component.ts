// parent-paiement.component.ts — Gestion paiement parent
import {
  Component, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { Router }                 from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-parent-paiement',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  styles: [`
    :host { display:block; min-height:100dvh; background:#F0F4F8; }
    .header { background:#185FA5; color:white; padding:16px 20px;
              display:flex; align-items:center; gap:12px; }
    .btn-back { background:none; border:none; color:white; cursor:pointer;
                padding:4px; display:flex; align-items:center; }
    .header-titre { font-size:16px; font-weight:600; }

    .card { background:white; margin:12px 16px; border-radius:16px; padding:20px;
             box-shadow:0 1px 6px rgba(0,0,0,.06); }
    .card-titre { font-size:15px; font-weight:700; color:#111; margin-bottom:16px; }

    .stat-row { display:flex; justify-content:space-between;
                padding:10px 0; border-bottom:0.5px solid #F0F4F8; }
    .stat-lbl { font-size:13px; color:#555; }
    .stat-val { font-size:13px; font-weight:600; }
    .stat-val--vert  { color:#059669; }
    .stat-val--rouge { color:#DC2626; }

    .progress-track { height:12px; background:#E5E7EB; border-radius:99px;
                       overflow:hidden; margin:12px 0; }
    .progress-fill  { height:100%; border-radius:99px; }
    .progress-fill--vert  { background:linear-gradient(90deg,#10B981,#059669); }
    .progress-fill--amber { background:linear-gradient(90deg,#FBBF24,#D97706); }
    .progress-fill--rouge { background:linear-gradient(90deg,#F87171,#DC2626); }

    /* Historique */
    .histo-item { display:flex; justify-content:space-between;
                  padding:10px 0; border-bottom:0.5px solid #F0F4F8;
                  font-size:13px; }
    .histo-date { color:#9CA3AF; font-size:11px; margin-top:2px; }
    .histo-montant { font-weight:700; color:#059669; }

    /* Formulaire demande */
    .field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
    label  { font-size:13px; font-weight:500; color:#444; }
    .fi    { height:48px; padding:0 14px; font-size:15px; width:100%;
             border:1.5px solid #D1D9E6; border-radius:10px; background:white;
             outline:none; color:#111; box-sizing:border-box; }
    .fi:focus { border-color:#185FA5; }
    select.fi { cursor:pointer; }
    .btn-soumettre { width:100%; height:50px; background:#059669; color:white;
                      border:none; border-radius:12px; font-size:15px; font-weight:600;
                      cursor:pointer; margin-top:8px; }
    .btn-soumettre:disabled { opacity:.45; cursor:default; }
    .info-box { background:#FEF3C7; border-radius:10px; padding:12px 14px;
                font-size:12px; color:#78350F; margin-bottom:16px; line-height:1.5; }
    .success-bandeau { background:#DCFCE7; border-radius:10px; padding:12px 14px;
                        font-size:13px; color:#064E3B; font-weight:500;
                        text-align:center; margin-bottom:12px; }
  `],
  template: `
<div>
  <div class="header">
    <button class="btn-back" (click)="router.navigate(['/espace-parent/dashboard'])">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="white"/>
      </svg>
    </button>
    <div class="header-titre">Pension scolaire</div>
  </div>

  <!-- Résumé -->
  @if (paiement()) {
    <div class="card">
      <div class="card-titre">Solde {{ annee() }}</div>
      <div class="stat-row">
        <span class="stat-lbl">Montant total</span>
        <span class="stat-val">{{ fcfa(paiement()!.montant_attendu) }} FCFA</span>
      </div>
      <div class="stat-row">
        <span class="stat-lbl">Payé</span>
        <span class="stat-val stat-val--vert">{{ fcfa(paiement()!.montant_paye) }} FCFA</span>
      </div>
      <div class="stat-row" style="border:none">
        <span class="stat-lbl">Reste à payer</span>
        <span [class]="paiement()!.reste_a_payer > 0 ? 'stat-val stat-val--rouge' : 'stat-val stat-val--vert'">
          {{ fcfa(paiement()!.reste_a_payer) }} FCFA
        </span>
      </div>
      <div class="progress-track">
        <div [class]="progressCls()" [style.width.%]="paiement()!.taux_paiement"></div>
      </div>
      <div style="text-align:right;font-size:11px;color:#9CA3AF">
        {{ paiement()!.taux_paiement }}% réglé
      </div>
      @if (paiement()!.prochain_rdv) {
        <div style="margin-top:10px;font-size:12px;color:#555">
          📅 Prochain RDV :
          <strong [class]="paiement()!.rdv_depasse ? 'stat-val--rouge' : ''">
            {{ fmtDate(paiement()!.prochain_rdv!) }}
            @if (paiement()!.rdv_depasse) { ⚠️ }
          </strong>
        </div>
      }
    </div>
  }

  <!-- Initier un paiement -->
  @if ((paiement()?.reste_a_payer ?? 0) > 0) {
    <div class="card">
      <div class="card-titre">Initier un paiement</div>
      <div class="info-box">
        ⚠️ Votre paiement sera enregistré comme <strong>demande</strong>.
        Il sera validé par l'administration après vérification.
        Conservez votre reçu.
      </div>

      @if (envoiOk()) {
        <div class="success-bandeau">✅ Votre demande a bien été envoyée !</div>
      }

      <form [formGroup]="formPaiement">
        <div class="field">
          <label>Montant (FCFA) *</label>
          <input class="fi" formControlName="montant" type="number"
                 inputmode="numeric" placeholder="ex: 25000">
        </div>
        <div class="field">
          <label>Mode de paiement *</label>
          <select class="fi" formControlName="mode_paiement">
            <option value="">— Choisir —</option>
            <option value="mobile_money">Mobile Money (MTN / Orange)</option>
            <option value="cash">Espèces</option>
            <option value="virement">Virement bancaire</option>
          </select>
        </div>
        <div class="field">
          <label>Référence / N° reçu</label>
          <input class="fi" formControlName="reference"
                 placeholder="Numéro de transaction (optionnel)">
        </div>
        <div class="field">
          <label>Commentaire</label>
          <input class="fi" formControlName="commentaire"
                 placeholder="Note optionnelle">
        </div>
        <button class="btn-soumettre" (click)="soumettre()"
                [disabled]="formPaiement.invalid || envoi()">
          @if (envoi()) { ⏳ Envoi en cours… }
          @else { Envoyer la demande }
        </button>
      </form>
    </div>
  }

  <!-- Historique -->
  @if (historique().length > 0) {
    <div class="card">
      <div class="card-titre">Historique des paiements</div>
      @for (p of historique(); track p.id_paiement) {
        <div class="histo-item">
          <div>
            <div>{{ p.mode_paiement }}</div>
            <div class="histo-date">{{ fmtDate(p.date_paiement) }}</div>
          </div>
          <div class="histo-montant">+ {{ fcfa(+p.montant_verse) }} FCFA</div>
        </div>
      }
    </div>
  }
</div>
  `
})
export class ParentPaiementComponent {

  private svc = inject(ParentService);
  readonly router = inject(Router);

  paiement   = this.svc.paiement;
  historique = computed(() => this.paiement()?.historique ?? []);
  annee      = computed(() => this.svc.famille()?.annee_scolaire ?? '');
  envoi      = signal(false);
  envoiOk    = signal(false);

  formPaiement = new FormGroup({
    montant:       new FormControl(null as number | null, [Validators.required, Validators.min(1000)]),
    mode_paiement: new FormControl('', Validators.required),
    reference:     new FormControl(''),
    commentaire:   new FormControl(''),
  });

  async soumettre(): Promise<void> {
    if (this.formPaiement.invalid) return;
    this.envoi.set(true);
    const ok = await this.svc.initierPaiement({
      id_famille:    this.svc.session()?.id_famille ?? '',
      montant:       +(this.formPaiement.value.montant ?? 0),
      mode_paiement: this.formPaiement.value.mode_paiement as any,
      reference:     this.formPaiement.value.reference ?? '',
      commentaire:   this.formPaiement.value.commentaire ?? '',
    });
    this.envoi.set(false);
    if (ok) {
      this.envoiOk.set(true);
      this.formPaiement.reset();
    }
  }

  progressCls(): string {
    const t = this.paiement()?.taux_paiement ?? 0;
    if (t >= 100) return 'progress-fill progress-fill--vert';
    if (t >= 50)  return 'progress-fill progress-fill--amber';
    return 'progress-fill progress-fill--rouge';
  }

  fcfa(n: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(n)); }
  fmtDate(iso: string): string {
    try { return new Date(iso).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }); }
    catch { return iso; }
  }
}


// ─────────────────────────────────────────────────────────────────
// parent-eleve.component.ts — Détail élève (notes + absences)
// ─────────────────────────────────────────────────────────────────
import { Component as Comp2, inject as inj2, ChangeDetectionStrategy as CD2, computed as cmp2 } from '@angular/core';
import { ActivatedRoute }  from '@angular/router';

@Comp2({
  selector: 'app-parent-eleve',
  standalone: true,
  changeDetection: CD2.OnPush,
  imports: [RouterLink2],
  styles: [`
    :host { display:block; min-height:100dvh; background:#F0F4F8; }
    .header { background:#185FA5; color:white; padding:16px 20px;
              display:flex; align-items:center; gap:12px; }
    .btn-back { background:none; border:none; color:white; cursor:pointer;
                padding:4px; display:flex; align-items:center; }
    .card { background:white; margin:12px 16px; border-radius:16px; padding:18px;
             box-shadow:0 1px 6px rgba(0,0,0,.06); }
    .card-titre { font-size:14px; font-weight:700; color:#185FA5; margin-bottom:12px; }
    .seq-item { display:flex; justify-content:space-between; align-items:center;
                padding:8px 0; border-bottom:0.5px solid #F0F4F8; font-size:13px; }
    .moy-val { font-weight:700; font-size:15px; }
    .moy-ok  { color:#059669; }
    .moy-warn{ color:#D97706; }
    .moy-bad { color:#DC2626; }
    .abs-item { padding:8px 0; border-bottom:0.5px solid #F0F4F8; font-size:13px; }
    .abs-date { color:#9CA3AF; font-size:11px; }
    .badge { display:inline-block; padding:2px 8px; border-radius:99px; font-size:11px; }
    .badge--ok  { background:#DCFCE7; color:#064E3B; }
    .badge--warn{ background:#FEF3C7; color:#78350F; }
    .info-eleve { display:flex; align-items:center; gap:12px; }
    .av { width:48px; height:48px; border-radius:50%; background:#EBF3FC;
          color:#185FA5; font-size:16px; font-weight:700;
          display:flex; align-items:center; justify-content:center; }
    .empty { text-align:center; padding:24px; color:#9CA3AF; font-size:13px; }
  `],
  template: `
<div>
  <div class="header">
    <a [routerLink]="['/espace-parent/dashboard']" class="btn-back">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="white"/>
      </svg>
    </a>
    <span style="font-size:16px;font-weight:600">{{ eleve()?.prenom }} {{ eleve()?.nom }}</span>
  </div>

  @if (eleve()) {
    <!-- Infos élève -->
    <div class="card">
      <div class="info-eleve">
        <div class="av">{{ eleve()!.nom[0] }}{{ eleve()!.prenom[0] }}</div>
        <div>
          <div style="font-size:15px;font-weight:600">{{ eleve()!.prenom }} {{ eleve()!.nom }}</div>
          <div style="font-size:12px;color:#9CA3AF">{{ eleve()!.nom_classe }} · {{ eleve()!.niveau }}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:14px;text-align:center">
        <div>
          <div style="font-size:20px;font-weight:700" [class]="moyenneCls(eleve()!.moy_trimestrielle)">
            {{ eleve()!.moy_trimestrielle?.toFixed(1) ?? '—' }}
          </div>
          <div style="font-size:10px;color:#9CA3AF">Moyenne</div>
        </div>
        <div>
          <div style="font-size:20px;font-weight:700;color:#555">
            {{ eleve()!.rang ?? '—' }}/{{ eleve()!.effectif_classe }}
          </div>
          <div style="font-size:10px;color:#9CA3AF">Rang</div>
        </div>
        <div>
          <div style="font-size:20px;font-weight:700" [class]="absencesCls(eleve()!.absences_count)">
            {{ eleve()!.absences_count }}
          </div>
          <div style="font-size:10px;color:#9CA3AF">Absences</div>
        </div>
      </div>
    </div>

    <!-- Moyennes par séquence -->
    <div class="card">
      <div class="card-titre">📊 Résultats par séquence</div>
      @if (eleve()!.moyennes.length === 0) {
        <div class="empty">Aucune note disponible</div>
      } @else {
        @for (m of eleve()!.moyennes; track m.sequence) {
          <div class="seq-item">
            <span>{{ m.sequence }}</span>
            <span class="moy-val" [class]="moyenneCls(m.moyenne)">
              {{ m.moyenne !== null ? m.moyenne.toFixed(2) + '/20' : '—' }}
            </span>
          </div>
        }
        @if (eleve()!.moy_trimestrielle !== null) {
          <div class="seq-item" style="border:none;font-weight:600">
            <span>Moyenne trimestrielle</span>
            <span class="moy-val" [class]="moyenneCls(eleve()!.moy_trimestrielle)">
              {{ eleve()!.moy_trimestrielle!.toFixed(2) }}/20
            </span>
          </div>
        }
      }
    </div>

    <!-- Absences -->
    <div class="card">
      <div class="card-titre">📅 Absences ({{ eleve()!.absences_count }})</div>
      @if (eleve()!.absences_count === 0) {
        <div class="empty">Aucune absence enregistrée 🎉</div>
      } @else {
        <div style="font-size:13px;color:#555;margin-bottom:8px">
          Non justifiées : <strong>{{ eleve()!.absences_non_justifiees }}</strong>
        </div>
        @if (eleve()!.derniere_absence) {
          <div class="abs-item" style="border:none">
            <div>Dernière absence</div>
            <div class="abs-date">{{ fmtDate(eleve()!.derniere_absence!) }}</div>
          </div>
        }
      }
    </div>
  } @else {
    <div style="text-align:center;padding:40px;color:#9CA3AF">Élève introuvable</div>
  }
</div>
  `
})
export class ParentEleveComponent {

  private svc   = inj2(ParentService);
  private route = inj2(ActivatedRoute);

  eleve = cmp2(() => {
    const id = this.route.snapshot.paramMap.get('id');
    return this.svc.eleves().find((e:any) => e.id_eleve === id) ?? null;
  });

  moyenneCls(m: number | null): string {
    if (m === null) return '';
    if (m >= 10) return 'moy-ok';
    if (m >= 8)  return 'moy-warn';
    return 'moy-bad';
  }
  absencesCls(n: number): string {
    if (n === 0) return 'moy-ok';
    if (n < 3)   return 'moy-warn';
    return 'moy-bad';
  }
  fmtDate(iso: string): string {
    try { return new Date(iso).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }); }
    catch { return iso; }
  }
}

// Import manquant RouterLink
import { RouterLink as RouterLink2 } from '@angular/router';
import { ParentService } from '../../../core/services/parent.service';
