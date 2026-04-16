// famille-modal.component.ts — création / modification famille (modèle unifié)
// Famille contient directement montant_total_attendu, montant_reduction, commentaire
// ngx-mask sur les champs montant (separator.0 + thousandSeparator=" ")
import {
  Component, inject, signal, OnInit, AfterViewInit, OnDestroy
} from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

import { DataService } from '../../../core/services/data.service';
import { Famille } from '../../../core/models';

declare const L: any;

export interface FamilleModalData { famille: Famille | null; }

const TILES: Record<string, string> = {
  OSM: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  Satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  Sombre: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};

@Component({
  selector: 'app-famille-modal',
  standalone: true,
  providers: [provideNgxMask()],
  imports: [ReactiveFormsModule, MatDialogModule, NgxMaskDirective],
  styles: [`
    .host  { display:flex; flex-direction:column; font-size:13px;
             width:100%; max-width:500px; }
    .head  { display:flex; align-items:center; justify-content:space-between;
             padding:13px 17px 11px; border-bottom:0.5px solid rgba(0,0,0,.09); }
    .body  { padding:14px 17px; display:flex; flex-direction:column; gap:11px;
             max-height:72vh; overflow-y:auto; }
    .foot  { display:flex; justify-content:flex-end; gap:8px;
             padding:10px 17px 13px; border-top:0.5px solid rgba(0,0,0,.09); }

    label  { font-size:11px; color:#888; display:block; margin-bottom:3px; }
    .fi    { width:100%; height:32px; padding:0 10px; font-size:13px;
             border:0.5px solid rgba(0,0,0,.18); border-radius:6px;
             background:white; outline:none; color:#333;
             transition:border-color .15s; }
    .fi:focus { border-color:#185FA5; }
    .fi.err   { border-color:#A32D2D; }
    .hint  { font-size:10px; color:#A32D2D; margin-top:2px; }
    .g2    { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .div   { height:0.5px; background:rgba(0,0,0,.08); }

    /* Section frais */
    .frais       { border:0.5px solid rgba(0,0,0,.1); border-radius:8px; }
    .frais-head  { display:flex; align-items:center; justify-content:space-between;
                   padding:9px 12px; background:#f0f8ff;
                   border-radius:8px 8px 0 0;
                   border-bottom:0.5px solid rgba(0,0,0,.08); }
    .frais-title { font-size:12px; font-weight:500; color:#0C447C; }
    .frais-body  { padding:11px 12px; display:flex; flex-direction:column; gap:9px; }
    .preview     { background:#f8f8f8; border-radius:6px; padding:8px 11px;
                   display:flex; justify-content:space-between; align-items:center;
                   font-size:11px; }
    .frais-off   { padding:10px 12px; font-size:11px; color:#aaa; }

    /* Toggle */
    .tog     { width:32px; height:18px; border-radius:9px; background:#ccc;
               position:relative; cursor:pointer; transition:background .2s;
               display:inline-block; flex-shrink:0; }
    .tog.on  { background:#185FA5; }
    .tog::after { content:''; position:absolute; top:2px; left:2px;
                  width:14px; height:14px; background:white; border-radius:50%;
                  transition:transform .2s; }
    .tog.on::after { transform:translateX(14px); }

    /* Suffixe FCFA */
    .wrap   { position:relative; }
    .sfx    { position:absolute; right:10px; top:50%; transform:translateY(-50%);
              font-size:11px; color:#aaa; pointer-events:none; }

    /* Boutons */
    .btn   { height:32px; padding:0 14px; border-radius:6px; font-size:13px;
             cursor:pointer; display:inline-flex; align-items:center; gap:5px;
             border:0.5px solid rgba(0,0,0,.18); background:white; color:#333; }
    .btn:disabled         { opacity:.35; cursor:default; }
    .btn:not(:disabled):hover { background:#f5f5f5; }
    .btn-p { background:#185FA5; color:#fff; border:none; }
    .btn-p:not(:disabled):hover { opacity:.88; }
    .close { width:28px; height:28px; border:0.5px solid rgba(0,0,0,.12);
             background:white; border-radius:5px; cursor:pointer;
             display:flex; align-items:center; justify-content:center; color:#555; }
    .close:hover { background:#FCEBEB; color:#A32D2D; }
    .spinner { width:13px; height:13px; border-radius:50%;
               border:2px solid rgba(255,255,255,.3); border-top-color:#fff;
               animation:sp .7s linear infinite; display:inline-block; }
    @keyframes sp { to { transform:rotate(360deg); } }
  `],
  template: `
<div class="host">

  <!-- En-tête -->
  <div class="head">
    <span style="font-size:14px;font-weight:500">
      {{ isEdit ? 'Modifier la famille' : 'Nouvelle famille' }}
    </span>
    <button class="close" mat-dialog-close>✕</button>
  </div>

  <div class="body">
    <form [formGroup]="form">

      <!-- Nom -->
      <div>
        <label>Nom de la famille *</label>
        <input class="fi"
               [class.err]="fc.nom_famille.invalid && fc.nom_famille.touched"
               formControlName="nom_famille"
               placeholder="Famille Ateba Paul">
        @if (fc.nom_famille.invalid && fc.nom_famille.touched) {
          <div class="hint">Champ requis</div>
        }
      </div>

      <!-- Téléphones -->
      <div class="g2">
        <div>
          <label>Tél. père *</label>
          <input class="fi"
                 [class.err]="fc.tel_pere.invalid && fc.tel_pere.touched"
                 formControlName="tel_pere" type="tel" placeholder="699 …">
          @if (fc.tel_pere.invalid && fc.tel_pere.touched) {
            <div class="hint">Requis</div>
          }
        </div>
        <div>
          <label>Tél. mère</label>
          <input class="fi" formControlName="tel_mere" type="tel" placeholder="677 …">
        </div>
      </div>

      <div class="g2">
        <div>
          <label>Autre tél.</label>
          <input class="fi" formControlName="tel_autre" type="tel" placeholder="Optionnel">
        </div>
        <div>
          <label>Adresse</label>
          <input class="fi" formControlName="adresse_texte" placeholder="Quartier, rue…">
        </div>
      </div>

      <!-- GPS -->
      <div>
        <div style="display:flex;align-items:center;
                    justify-content:space-between;margin-bottom:5px">
          <label style="margin:0">GPS (optionnel)</label>
          <div style="display:flex;gap:4px">
            @for (tk of tileKeys; track tk) {
              <button type="button"
                      [style]="tuile()===tk
                        ? 'background:#EBF3FC;color:#185FA5;border-color:#B5D4F4;font-weight:500'
                        : ''"
                      style="height:22px;padding:0 8px;border-radius:6px;font-size:10px;
                             cursor:pointer;border:0.5px solid rgba(0,0,0,.18);
                             background:white;color:#555"
                      (click)="changerTuile(tk)">{{ tk }}</button>
            }
          </div>
        </div>
        <div id="fam-map"
             style="height:120px;border-radius:6px;overflow:hidden;
                    border:0.5px solid rgba(0,0,0,.18)"></div>
        <div style="display:flex;justify-content:space-between;
                    margin-top:3px;font-size:10px;color:#aaa">
          @if (lat() && lng()) {
            <span style="color:#0F6E56">
              {{ lat()!.toFixed(5) }}, {{ lng()!.toFixed(5) }}
            </span>
            <span style="cursor:pointer;color:#A32D2D" (click)="effacer()">Effacer</span>
          } @else {
            <span>Cliquer sur la carte pour placer</span>
          }
        </div>
      </div>

   

    <div class="div"></div>

    <!-- ── FRAIS PENSION (champs directs sur Famille) ── -->
    <div class="frais">
   
  
        <div >

          <!-- Montant attendu avec ngx-mask -->
          <div>
            <label>Montant total attendu (FCFA) *</label>
            <div class="wrap">
              <input class="fi"
                     [class.err]="fc.montant.invalid && fc.montant.touched"
                     formControlName="montant"
                     mask="separator.0"
                     thousandSeparator=" "
                     separatorLimit="10000000"
                     [dropSpecialCharacters]="true"
                     placeholder="0"
                     style="font-size:16px;font-weight:500;padding-right:55px">
              <span class="sfx">FCFA</span>
            </div>
            @if (fc.montant.invalid && fc.montant.touched) {
              <div class="hint">Montant requis</div>
            }
          </div>

          <div class="g2">
            <!-- Réduction avec ngx-mask -->
            <div>
              <label>Réduction (FCFA)</label>
              <div class="wrap">
                <input class="fi"
                       formControlName="reduction"
                       mask="separator.0"
                       thousandSeparator=" "
                       separatorLimit="10000000"
                       [dropSpecialCharacters]="true"
                       placeholder="0"
                       style="padding-right:55px">
                <span class="sfx">FCFA</span>
              </div>
            </div>
            <div>
              <label>Motif</label>
              <input class="fi" formControlName="commentaire"
                     placeholder="ex: 3 enfants inscrits">
            </div>
          </div>

          <!-- Preview montant net -->
          @if (montantNet() > 0) {
            <div class="preview">
              <span style="color:#888">Net à régler</span>
              <div style="display:flex;align-items:center;gap:8px">
                @if (montantReduction() > 0) {
                  <span style="text-decoration:line-through;color:#bbb;font-size:11px">
                    {{ fmt(montantBrut()) }}
                  </span>
                }
                <span style="font-size:15px;font-weight:500;color:#0F6E56">
                  {{ fmt(montantNet()) }} FCFA
                </span>
              </div>
            </div>
          }

        </div>

    </div>
 </form>
  </div>

  <!-- Pied -->
  <div class="foot">
    <button class="btn" mat-dialog-close>Annuler</button>
    <button class="btn btn-p" (click)="save()" [disabled]="invalid() || saving()">
      @if (saving()) { <span class="spinner"></span> }
      {{ saving() ? 'Enregistrement…' : labelBtn() }}
    </button>
  </div>

</div>
  `
})
export class FamilleModalComponent implements OnInit, AfterViewInit, OnDestroy {

  readonly data = inject<FamilleModalData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<FamilleModalComponent>);
  private svc = inject(DataService);
  private snack = inject(MatSnackBar);

  isEdit = false;
  saving = signal(false);
  lat = signal<number | null>(null);
  lng = signal<number | null>(null);
  tuile = signal('OSM');
  fraisOn = signal(true);
  tileKeys = Object.keys(TILES);
  annee = `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;

  private map: any; private marker: any; private tileLayer: any;
  private familleId: string | null = null;

  // ── Formulaire infos famille ──
  form = new FormGroup({
    nom_famille: new FormControl('', Validators.required),
    tel_pere: new FormControl('', Validators.required),
    tel_mere: new FormControl(''),
    tel_autre: new FormControl(''),
    adresse_texte: new FormControl(''),
    montant: new FormControl('', Validators.required),
    reduction: new FormControl('0'),
    commentaire: new FormControl(''),
  });
  get fc() { return this.form.controls; }



  // ── Helpers lecture montants (ngx-mask → string → number) ──
  // dropSpecialCharacters:true retire les espaces → "25000" pas "25 000"
  toNum(v: string | null | undefined): number {
    const n = +(v ?? 0);
    return isNaN(n) ? 0 : n;
  }

  montantBrut() { return this.toNum(this.fc.montant.value); }
  montantReduction() { return this.toNum(this.fc.reduction.value); }
  montantNet() { return Math.max(0, this.montantBrut() - this.montantReduction()); }

  labelBtn(): string {
    if (this.isEdit) return 'Modifier';
    return this.fraisOn() ? 'Créer famille + frais' : 'Créer famille';
  }

  invalid(): boolean {
    if (this.form.invalid) return true;
    if (this.fraisOn() && (!this.fc.montant.value || this.montantBrut() <= 0)) return true;
    return false;
  }

  toggleFrais() { this.fraisOn.set(!this.fraisOn()); }

  // ── Init ──

  ngOnInit(): void {
    if (!this.data.famille) return;
    this.isEdit = true;
    this.familleId = this.data.famille.id_famille;
    // this.form.patchValue(this.data.famille);
    this.lat.set(this.data.famille.latitude ?? null);
    this.lng.set(this.data.famille.longitude ?? null);

    // Pré-remplit les frais si déjà saisis sur la famille
    // patchValue avec string car ngx-mask travaille en string
    this.form.patchValue({
      nom_famille: this.data.famille.nom_famille,
      tel_pere: this.data.famille.tel_pere,
      tel_mere: this.data.famille.tel_mere,
      tel_autre: this.data.famille.tel_autre ?? '',
      adresse_texte: this.data.famille.adresse_texte ?? '',
      montant: String(this.data.famille.montant_total_attendu ?? ''),
      reduction: String(this.data.famille.montant_reduction ?? '0'),
      commentaire: this.data.famille.commentaire ?? '',
    });

  }

  ngAfterViewInit(): void { setTimeout(() => this.initMap(), 150); }

  // ── Carte Leaflet ──

  private initMap(): void {
    this.map = L.map('fam-map', { zoomControl: true })
      .setView([this.lat() ?? 3.848, this.lng() ?? 11.502], 14);
    this.tileLayer = L.tileLayer(TILES[this.tuile()], {
      attribution: '© OpenStreetMap', maxZoom: 19
    }).addTo(this.map);
    if (this.lat() && this.lng()) this.pin(this.lat()!, this.lng()!);
    if (!this.isEdit) {
      navigator.geolocation?.getCurrentPosition(
        p => this.map.setView([p.coords.latitude, p.coords.longitude], 15),
        () => { }, { enableHighAccuracy: true, timeout: 5000 }
      );
    }
    this.map.on('click', (e: any) => {
      this.lat.set(e.latlng.lat); this.lng.set(e.latlng.lng);
      this.pin(e.latlng.lat, e.latlng.lng);
    });
  }

  private pin(lat: number, lng: number): void {
    if (this.marker) this.map.removeLayer(this.marker);
    this.marker = L.marker([lat, lng]).addTo(this.map)
      .bindPopup('Position de la maison');
  }

  changerTuile(key: string): void {
    this.tuile.set(key);
    if (this.tileLayer) this.map.removeLayer(this.tileLayer);
    this.tileLayer = L.tileLayer(TILES[key], {
      attribution: '© OpenStreetMap', maxZoom: 19
    }).addTo(this.map);
  }

  effacer(): void {
    this.lat.set(null); this.lng.set(null);
    if (this.marker) { this.map.removeLayer(this.marker); this.marker = null; }
  }

  ngOnDestroy(): void { if (this.map) this.map.remove(); }

  // ── Sauvegarde ──

  async save(): Promise<void> {
    if (this.invalid()) return;
    this.saving.set(true);

    const famille: Famille = {
      id_famille: this.familleId ?? `FAM-${Date.now()}`,
      nom_famille: this.form.value.nom_famille!,
      tel_pere: this.form.value.tel_pere!,
      tel_mere: this.form.value.tel_mere ?? '',
      tel_autre: this.form.value.tel_autre ?? '',
      adresse_texte: this.form.value.adresse_texte ?? '',
      latitude: this.lat() ?? undefined,
      longitude: this.lng() ?? undefined,
      // Frais directement sur Famille
      montant_total_attendu: this.montantBrut(),
      montant_reduction: this.montantReduction(),
      annee_scolaire: this.annee,
      commentaire: this.form.value.commentaire ?? '',

    };

    if (this.isEdit) await this.svc.updateFamille(famille);
    else await this.svc.addFamille(famille);

    this.saving.set(false);
    this.snack.open(this.isEdit ? 'Famille modifiée' : 'Famille créée', 'OK', { duration: 3000 });
    this.dialogRef.close({ success: true, famille });
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(n));
  }
}