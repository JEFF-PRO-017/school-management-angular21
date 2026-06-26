// pointage-modal.component.ts
import {
  Component, inject, signal, computed, Inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { AuthService, DataService } from '../../../../core/services';
import { MatiereConfig, PointageModalData, PointageResult } from '../../../../core/models';

@Component({
  selector: 'app-pointage-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule],
  template: `
<div class="modal-content border-0 p-4" style="min-width:420px;max-width:520px">

  <!-- En-tête -->
  <div class="modal-header border-bottom pb-2">
    <div>
      <h6 class="modal-title fw-semibold mb-0">Enregistrer le pointage</h6>
      <div class="text-primary" style="font-size:11px">
        {{ data.nom_classe }} · {{ fmtDate(data.date) }}
        · {{ data.nb_absents }} absent(s)
      </div>
    </div>
    <button type="button" class="btn-close" (click)="annuler()"></button>
  </div>

  <!-- Corps -->
  <div class="modal-body d-flex flex-column gap-3 py-3">

    <!-- Enseignant — admin uniquement -->
    @if (isAdmin()) {
      <div>
        <label class="form-label fw-medium" style="font-size:12px">
          Enseignant <span class="text-danger">*</span>
        </label>
        <select [formControl]="ctrlEnseignant" class="form-select form-select-sm"
                (change)="ctrlMatiere.setValue('')">
          <option value="">— Choisir —</option>
          @for (u of enseignants(); track u.id) {
            <option [value]="u.id">{{ u.nom }}</option>
          }
        </select>
      </div>
    } @else {
      <div class="d-flex align-items-center gap-2 p-2 rounded bg-light border"
           style="font-size:12px">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="5" r="3" stroke="#185FA5" stroke-width="1.3"/>
          <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"
                stroke="#185FA5" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        <span class="text-muted">Enseignant :</span>
        <span class="fw-medium">{{ userCourant()?.nom }}</span>
      </div>
    }

    <!-- Matière — chips cliquables -->
    <div>
      <label class="form-label fw-medium" style="font-size:12px">
        Matière <span class="text-danger">*</span>
      </label>
      @if (matieresDispo().length === 0) {
        <div class="text-muted p-2 border rounded bg-light" style="font-size:12px">
          @if (isAdmin() && !ctrlEnseignant.value) {
            Sélectionnez d'abord un enseignant
          } @else {
            Aucune matière assignée pour cette classe
          }
        </div>
      } @else {
        <div class="d-flex flex-wrap gap-2">
          @for (m of matieresDispo(); track m.id_matiere) {
            <button type="button" class="btn btn-sm"
                    [class.btn-primary]="ctrlMatiere.value === m.id_matiere"
                    [class.btn-outline-secondary]="ctrlMatiere.value !== m.id_matiere"
                    style="font-size:11px"
                    (click)="ctrlMatiere.setValue(m.id_matiere)">
              {{ m.nom_matiere }}
              <span class="badge ms-1 bg-white text-secondary" style="font-size:10px">
                coef {{ m.coefficient }}
              </span>
            </button>
          }
        </div>
      }
    </div>

    <!-- Horaires -->
    <div class="row g-2">
      <div class="col-6">
        <label class="form-label fw-medium" style="font-size:12px">
          Heure début <span class="text-danger">*</span>
        </label>
        <input [formControl]="ctrlDebut" type="time"
               class="form-control form-control-sm">
      </div>
      <div class="col-6">
        <label class="form-label fw-medium" style="font-size:12px">
          Heure fin <span class="text-danger">*</span>
        </label>
        <input [formControl]="ctrlFin" type="time"
               class="form-control form-control-sm">
      </div>
    </div>

    <!-- Durée calculée auto -->
    @if (dureeMin() > 0) {
      <div class="d-flex align-items-center gap-2 rounded px-3 py-2"
           style="background:#EBF3FC;font-size:12px">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.5" stroke="#185FA5" stroke-width="1.3"/>
          <path d="M8 4.5V8l2.5 2" stroke="#185FA5"
                stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        <span class="text-primary fw-medium">Durée : {{ fmtDuree(dureeMin()) }}</span>
      </div>
    } @else if (dureeMin() < 0) {
      <div class="alert alert-danger py-1 px-2 mb-0" style="font-size:12px">
        L'heure de fin doit être après l'heure de début
      </div>
    }

  </div>

  <!-- Pied -->
  <div class="modal-footer border-top pt-2 gap-2">
    <button type="button" class="btn btn-sm btn-outline-secondary"
            (click)="annuler()">Annuler</button>
    <button type="button" class="btn btn-sm btn-primary"
            [disabled]="!valide()"
            (click)="confirmer()">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" class="me-1">
        <path d="M3 8l4 4 6-7" stroke="white"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Enregistrer
    </button>
  </div>

</div>
  `,
})
export class PointageModalComponent {

  private auth  = inject(AuthService);
  private dataSvc = inject(DataService);
  private ref   = inject(MatDialogRef<PointageModalComponent>);
  data: PointageModalData = inject(MAT_DIALOG_DATA);

  // ── Utilisateur ──────────────────────────────────────────────────
  userCourant = computed(() => this.auth.user());
  isAdmin     = computed(() => this.auth.isAdmin());

  enseignants = computed(() =>
    this.dataSvc.getUsers().filter((u: any) => u.role === 'enseignant')
  );

  /** Matières filtrées : classe courante + enseignant actif */
  matieresDispo = computed<MatiereConfig[]>(() => {
    debugger
    const user     = this.auth.user() as any;
    const toutes: MatiereConfig[]|any[] = this.dataSvc.getMatieres() ?? [];
    const idEns    = this.isAdmin() ? this.ctrlEnseignant.value : user?.id;

    if (!idEns) return toutes.filter( m => m.id_classe  === this.data.id_classe)

    return toutes.filter(m =>
      m.id_classe    === this.data.id_classe &&
      m.id_enseignant === idEns
    );
  });

  // ── Formulaire ───────────────────────────────────────────────────
  ctrlEnseignant = new FormControl('');
  ctrlMatiere    = new FormControl('', Validators.required);
  ctrlDebut      = new FormControl(this.data?.heure_debut ?? '', Validators.required);
  ctrlFin        = new FormControl('', Validators.required);

  // ── Durée auto ───────────────────────────────────────────────────
  dureeMin = computed<number>(() => {
    const d = this.ctrlDebut.value;
    const f = this.ctrlFin.value;
    if (!d || !f) return 0;
    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    return toMin(f) - toMin(d);
  });

  // ── Validation ───────────────────────────────────────────────────
  valide = computed(() =>
    !!this.ctrlMatiere.value &&
    !!this.ctrlDebut.value  &&
    !!this.ctrlFin.value    &&
    this.dureeMin() > 0     &&
    (this.isAdmin() ? !!this.ctrlEnseignant.value : true)
  );
  // ── Actions ──────────────────────────────────────────────────────
  confirmer(): void {
    if (!this.valide()) return;
    const base  = this.data.date;
    const id = this.isAdmin()  ? this.ctrlEnseignant.value! : (this.userCourant()?.id ?? '')
    const date_fin = `${base}T${this.ctrlFin.value}:00`
    const result: PointageResult = {
      id_pointage    : `PO-${id}-${date_fin}`,
      id_matiere     : this.ctrlMatiere.value!,
      id_enseignants : id,
      date_debut     : `${base}T${this.ctrlDebut.value}:00`,
      date_fin       : date_fin,
      duree          : this.dureeMin(),
    };
    this.ref.close(result);
  }

  annuler(): void { this.ref.close(null); }

  // ── Helpers ──────────────────────────────────────────────────────
  fmtDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('fr-FR',
        { weekday: 'short', day: '2-digit', month: 'short' });
    } catch { return iso; }
  }

  fmtDuree(min: number): string {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
  }
}