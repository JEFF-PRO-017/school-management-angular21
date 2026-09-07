// modifier-enfant.component.ts
// Vue parent : modification d'un enfant existant + suppression.
// Persistance via PatchServices.updateEleve() et DeleteServices.deleteEleve().
//
// ⚠️ Hypothèses à vérifier :
//  - Route : '/espace-parent/eleve/:id/modifier' avec un paramètre nommé "id"
//    (à ajuster si ton routing utilise un autre nom de paramètre)
//  - Route de retour après succès/suppression : '/espace-parent'
import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { IconComponent } from '../../dashboard/icon.component';
import { ActivatedRoute, Router } from '@angular/router';
import { Classe, Eleve } from '../../../../core/models';
import { GetServices, PatchServices } from '../../../../core/services/@data';
import { DeleteServices } from '../../../../core/services/@data/_delete.services';
import { ParentService } from '../../../../core/services';
import { BreadcrumbComponent } from '../../components/breadcrumb.component';
import { ParentHeaderComponent } from '../../components/parent-header.component';


@Component({
    selector: 'app-modifier-enfant',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule, IconComponent, ParentHeaderComponent, BreadcrumbComponent,],
    template: `
    <app-parent-header titre="Fiche élève"></app-parent-header>
    <app-breadcrumb [items]="fil()"></app-breadcrumb>
    <div class="p-3">
         @if (!eleveActuel()) {
        <div class="text-center text-muted small py-4">Chargement de la fiche…</div>
      } @else {
        <form [formGroup]="form" class="card border-0 shadow-sm rounded-4 p-3">

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
            <label class="form-label small fw-semibold text-uppercase">Classe *</label>
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
                  [disabled]="form.invalid || envoi() || suppression()">
            @if (envoi()) {
              <span class="spinner-border spinner-border-sm me-2"></span> Enregistrement…
            } @else {
              Enregistrer les modifications
            }
          </button>
        </form>

        <!-- Action destructrice séparée, en bas
        <button class="btn btn-outline-danger w-100 mt-3" (click)="supprimer()"
                [disabled]="envoi() || suppression()">
          @if (suppression()) {
            <span class="spinner-border spinner-border-sm me-2"></span> Suppression…
          } @else {
            <app-icon name="trash" class="me-1"></app-icon> Supprimer cet enfant
          }
        </button> -->
      }
    </div>
  `,
})
export class ModifierEnfantComponent {
    private get = inject(GetServices);
    private patchSvc = inject(PatchServices);
    private deleteSvc = inject(DeleteServices);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private parentService = inject(ParentService)

    private idEleve = this.route.snapshot.paramMap.get('id') ?? '';

    envoi = signal(false);
    suppression = signal(false);
    private formInitialise = false;

    private famille = computed(() =>
        this.parentService.famille()
    );

    eleveActuel = computed(() =>
        this.famille()?.eleves?.find((e: { id_eleve: string; }) => e.id_eleve === this.idEleve) ?? null
    );

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

    constructor() {
        // Pré-remplit le formulaire dès que la fiche de l'élève est disponible (une seule fois).
        effect(() => {
            const e = this.eleveActuel();
            if (e && !this.formInitialise) {
                this.form.patchValue({
                    nom: e.nom,
                    prenom: e.prenom,
                    date_naissance: e.date_naissance ?? '',
                    lieu_naissance: e.lieu_naissance ?? '',
                    sexe: e.sexe ?? '',
                    id_classe: e.id_classe,
                });
                this.formInitialise = true;
            }
        });
    }

    async soumettre(): Promise<void> {
        const actuel = this.eleveActuel();
        if (this.form.invalid || !actuel) return;

        this.envoi.set(true);
        const v = this.form.value;
        const eleve: Eleve = {
            ...actuel,
            nom: v.nom ?? '',
            prenom: v.prenom ?? '',
            date_naissance: v.date_naissance ?? '',
            lieu_naissance: v.lieu_naissance ?? '',
            sexe: (v.sexe ?? undefined) as Eleve['sexe'],
            id_classe: v.id_classe ?? '',
            verifie: false,
            statut: 'NON-ACTIF'
        };

        try {
            await this.patchSvc.updateEleve(eleve);
            this.router.navigate(['/espace-parent/enfants']);
        } finally {
            this.envoi.set(false);
        }
    }

    async supprimer(): Promise<void> {
        const actuel = this.eleveActuel();
        if (!actuel) return;
        if (!confirm(`Supprimer définitivement ${actuel.prenom} ${actuel.nom} ?`)) return;

        this.suppression.set(true);
        try {
            await this.deleteSvc.deleteEleve(actuel.id_eleve);
            this.router.navigate(['/espace-parent/enfants']);
        } finally {
            this.suppression.set(false);
        }
    }
    fil() {
        return [
            { label: 'Mes enfants', route: '/espace-parent/enfants' },
            { label: 'Modifier la fiche' },
        ];
    }
}