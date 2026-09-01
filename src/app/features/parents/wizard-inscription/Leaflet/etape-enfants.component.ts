// etape-enfants.component.ts
// Étape 3 : un ou plusieurs enfants, chacun avec sa classe souhaitée.
// Le FormArray est fourni par le parent ; on l'édite directement
// (push/removeAt) puis on prévient le parent via "changed" pour le cache.
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { FormArray, FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';

export interface ClasseOption { id_classe: string; nom_classe: string; }
export interface GroupeCycle { cycle: string; classes: ClasseOption[]; }

@Component({
  selector: 'app-etape-enfants',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div class="card m-3 shadow-sm rounded-4 p-3">
      <h2 class="h6 fw-bold mb-0">👶 Enfants à inscrire</h2>
      <p class="text-muted small mb-3">Renseignez au moins un enfant avec sa classe</p>

      @for (ctrl of enfants.controls; track $index; let i = $index) {
        <div class="card border mb-3 position-relative p-3" [formGroup]="asGroup(ctrl)">
          <div class="small fw-bold text-primary text-uppercase mb-2">Enfant {{ i + 1 }}</div>

          @if (enfants.length > 1) {
            <button type="button"
                    class="btn btn-sm btn-outline-danger rounded-circle position-absolute top-0 end-0 m-2"
                    style="width:26px;height:26px;padding:0"
                    (click)="supprimerEnfant(i)">✕</button>
          }

          <div class="row g-2">
            <div class="col-6">
              <label class="form-label small fw-semibold text-uppercase">Nom *</label>
              <input class="form-control"
                     [class.is-invalid]="ctrl.get('nom')!.invalid && ctrl.get('nom')!.touched"
                     formControlName="nom" placeholder="Nom">
            </div>
            <div class="col-6">
              <label class="form-label small fw-semibold text-uppercase">Prénom *</label>
              <input class="form-control"
                     [class.is-invalid]="ctrl.get('prenom')!.invalid && ctrl.get('prenom')!.touched"
                     formControlName="prenom" placeholder="Prénom">
            </div>
          </div>

          <div class="row g-2 mt-1">
            <div class="col-6">
              <label class="form-label small fw-semibold text-uppercase">Date de naissance</label>
              <input class="form-control" type="date" formControlName="date_naissance">
            </div>
            <div class="col-6">
              <label class="form-label small fw-semibold text-uppercase">Sexe</label>
              <select class="form-select" formControlName="sexe">
                <option value="">—</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
          </div>

          <div class="mt-2">
            <label class="form-label small fw-semibold text-uppercase">Classe souhaitée *</label>
            <select class="form-select"
                    [class.is-invalid]="ctrl.get('id_classe')!.invalid && ctrl.get('id_classe')!.touched"
                    formControlName="id_classe">
              <option value="">— Sélectionner une classe —</option>
              @for (g of classesParCycle; track g.cycle) {
                <optgroup [label]="g.cycle">
                  @for (c of g.classes; track c.id_classe) {
                    <option [value]="c.id_classe">{{ c.nom_classe }}</option>
                  }
                </optgroup>
              }
            </select>
            @if (ctrl.get('id_classe')!.invalid && ctrl.get('id_classe')!.touched) {
              <div class="invalid-feedback d-block">Veuillez choisir une classe</div>
            }
          </div>
        </div>
      }

      <button type="button" class="btn btn-outline-primary w-100" (click)="ajouterEnfant()">
        + Ajouter un autre enfant
      </button>

      <div class="d-flex gap-2 mt-3">
        <button class="btn btn-outline-secondary" style="width:50px" (click)="precedent.emit()">←</button>
        <button class="btn btn-primary flex-fill" (click)="suivant.emit()" [disabled]="enfants.invalid">
          Suivant →
        </button>
      </div>
    </div>
  `,
})
export class EtapeEnfantsComponent {
  @Input({ required: true }) enfants!: FormArray<FormGroup>;
  @Input() classesParCycle: GroupeCycle[] = [];

  @Output() precedent = new EventEmitter<void>();
  @Output() suivant = new EventEmitter<void>();
  // Prévient le parent après ajout/suppression, pour qu'il sauvegarde le cache
  @Output() changed = new EventEmitter<void>();

  asGroup(ctrl: any): FormGroup { return ctrl as FormGroup; }

  private creerGroupeEnfant(): FormGroup {
    return new FormGroup({
      nom: new FormControl('', Validators.required),
      prenom: new FormControl('', Validators.required),
      date_naissance: new FormControl(''),
      sexe: new FormControl(''),
      id_classe: new FormControl('', Validators.required),
    });
  }

  ajouterEnfant(): void {
    this.enfants.push(this.creerGroupeEnfant());
    this.changed.emit();
  }

  supprimerEnfant(i: number): void {
    this.enfants.removeAt(i);
    this.changed.emit();
  }
}