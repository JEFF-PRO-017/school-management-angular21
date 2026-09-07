// ajouter-enfant.component.ts
// Vue parent : ajout d'un enfant à une famille déjà inscrite.
// Persistance via AddServices.addEleve() — les champs id_eleve, date_inscription,
// statut et verifie sont générés automatiquement ici (l'admin les affine ensuite).
//
// ⚠️ Hypothèses à vérifier :
//  - Route de retour après succès : '/espace-parent' (à ajuster si le dashboard a un autre chemin)
//  - StatutEleve accepte bien la valeur 'NON-ACTIF' (confirmé pour ce cas)
import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IconComponent } from '../../dashboard/icon.component';
import { Classe, StatutEleve } from '../../../../core/models';
import { AddServices, GetServices } from '../../../../core/services/@data';
import { SessionService } from '../../../../core/services/@session/session.service';
import { BreadcrumbComponent } from '../../components/breadcrumb.component';
import { ParentHeaderComponent } from '../../components/parent-header.component';


@Component({
  selector: 'app-ajouter-enfant',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent, ParentHeaderComponent, BreadcrumbComponent,],
  template: `
    <app-parent-header titre="Fiche élève"></app-parent-header>
    <app-breadcrumb [items]="fil()"></app-breadcrumb>
    <div class="p-3">
      <form [formGroup]="form" class="card border-0 shadow-sm rounded-4 ">

        <div class="row g-2">
          <div class="col-6">
            <label class="form-label small fw-semibold text-uppercase">Nom *</label>
            <input class="form-control" [class.is-invalid]="nom.invalid && nom.touched"
                   formControlName="nom" placeholder="Nom">
            @if (nom.invalid && nom.touched) {
              <div class="invalid-feedback">Requis</div>
            }
          </div>
          <div class="col-6">
            <label class="form-label small fw-semibold text-uppercase">Prénom *</label>
            <input class="form-control" [class.is-invalid]="prenom.invalid && prenom.touched"
                   formControlName="prenom" placeholder="Prénom">
            @if (prenom.invalid && prenom.touched) {
              <div class="invalid-feedback">Requis</div>
            }
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
          <label class="form-label small fw-semibold text-uppercase">Lieu de naissance</label>
          <input class="form-control" formControlName="lieu_naissance" placeholder="Optionnel">
        </div>

        <div class="mt-2">
          <label class="form-label small fw-semibold text-uppercase">Classe souhaitée *</label>
          <select class="form-select" [class.is-invalid]="idClasse.invalid && idClasse.touched"
                  formControlName="id_classe">
            <option value="">— Sélectionner une classe —</option>
            @for (g of classesParCycle(); track g.cycle) {
              <optgroup [label]="g.cycle">
                @for (c of g.classes; track c.id_classe) {
                  <option [value]="c.id_classe">{{ c.nom_classe }}</option>
                }
              </optgroup>
            }
          </select>
          @if (idClasse.invalid && idClasse.touched) {
            <div class="invalid-feedback d-block">Veuillez choisir une classe</div>
          }
        </div>

        <button class="btn btn-primary w-100 mt-3" (click)="soumettre()"
                [disabled]="form.invalid || envoi()">
          @if (envoi()) {
            <span class="spinner-border spinner-border-sm me-2"></span> Envoi en cours…
          } @else {
            <app-icon name="user-plus" class="me-1"></app-icon> Ajouter cet enfant
          }
        </button>
      </form>
    </div>
  `,
})
export class AjouterEnfantComponent {
  private addSvc = inject(AddServices);
  private get = inject(GetServices);
  private sessionService = inject(SessionService);
  private router = inject(Router);

  private session = this.sessionService.get();

  envoi = signal(false);

  form = new FormGroup({
    nom: new FormControl('', Validators.required),
    prenom: new FormControl('', Validators.required),
    date_naissance: new FormControl(''),
    lieu_naissance: new FormControl(''),
    sexe: new FormControl(''),
    id_classe: new FormControl('', Validators.required),
  });

  get nom() { return this.form.controls.nom; }
  get prenom() { return this.form.controls.prenom; }
  get idClasse() { return this.form.controls.id_classe; }

  classesParCycle = computed(() => {
    const map = new Map<string, Classe[]>();
    this.get.getClasses().forEach((c: any) => {
      if (!map.has(c.cycle)) map.set(c.cycle, []);
      map.get(c.cycle)!.push(c);
    });
    return [...map.entries()].map(([cycle, classes]) => ({ cycle, classes }));
  });

  async soumettre(): Promise<void> {
    if (this.form.invalid) return;
    this.envoi.set(true);

    const v = this.form.value;
    const eleve = {
      id_eleve: `ELV-TMP-${Date.now()}`,
      id_famille: this.session?.id_famille ?? '',
      id_classe: v.id_classe ?? '',
      nom: v.nom ?? '',
      prenom: v.prenom ?? '',
      date_naissance: v.date_naissance ?? '',
      lieu_naissance: v.lieu_naissance ?? '',
      sexe: v.sexe ?? '',
      date_inscription: new Date().toISOString(),
      statut: 'NON-ACTIF' as StatutEleve,
      verifie: false,
    };

    try {
      await this.addSvc.addEleve(eleve);
      this.router.navigate(['/espace-parent/enfants']);
    } finally {
      this.envoi.set(false);
    }
  }
    fil() {
    return [
      { label: 'Mes enfants', route: '/espace-parent/enfants' },
      { label:  'Ajouter un enfant' },
    ];
  }
}