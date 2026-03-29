// transfert-eleve-dialog.component.ts
// Dialog permettant à un enseignant de voir un élève dans une autre classe
// et de naviguer vers cette classe sans modifier les données (consultation)
import { Component, Inject, inject, computed } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { CacheService } from '../../../core/services/cache.service';
import { DataService } from '../../../core/services/data.service';
import { AuthService } from '../../../core/services/auth.service';
import { Eleve } from '../../../core/models';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface TransfertDialogData {
  eleve: Eleve;
}

@Component({
  selector: 'app-transfert-eleve-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatSelectModule, MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>
      Changer la classe de {{ data.eleve.nom }} {{ data.eleve.prenom }}
    </h2>

    <mat-dialog-content>
      <p class="text-muted small mb-3">
        Classe actuelle :
        <strong>{{ classeActuelle() }}</strong>
      </p>

      <mat-form-field class="w-100" appearance="outline">
        <mat-label>Nouvelle classe</mat-label>
        <mat-select [formControl]="nouvelleClasse">
          @for (c of classesDisponibles(); track c.id_classe) {
            @if (c.id_classe !== data.eleve.id_classe) {
              <mat-option [value]="c.id_classe">
                {{ c.nom_classe }}
                ({{ effectif(c.id_classe) }}/{{ c.effectif_max }})
              </mat-option>
            }
          }
        </mat-select>
      </mat-form-field>

      <!-- Avertissement si classe pleine -->
      @if (classeSelectionneeEstPleine()) {
        <div class="alert alert-warning py-2 small">
          <mat-icon style="font-size:16px;vertical-align:middle">warning</mat-icon>
          Cette classe atteint sa capacité maximale.
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-raised-button color="primary"
              [disabled]="!nouvelleClasse.value"
              (click)="confirmer()">
        <mat-icon>swap_horiz</mat-icon> Transférer
      </button>
    </mat-dialog-actions>
  `
})
export class TransfertEleveDialogComponent {

  private cache  = inject(CacheService);
  private data_s = inject(DataService);
  private auth   = inject(AuthService);
  private snack  = inject(MatSnackBar);

  nouvelleClasse = new FormControl('');

  constructor(
    public dialogRef: MatDialogRef<TransfertEleveDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TransfertDialogData
  ) {}

  // Toutes les classes disponibles (admin = toutes, enseignant = ses classes)
  classesDisponibles = computed(() => {
    const all = this.cache.getClasses() ?? [];
    if (this.auth.isAdmin()) return all;
    const assigned = this.auth.getClassesAssignees();
    return all.filter(c => assigned.includes(c.id_classe));
  });

  classeActuelle = computed(() =>
    this.cache.classesMap().get(this.data.eleve.id_classe)?.nom_classe ?? '—'
  );

  effectif(id: string): number {
    return (this.cache.getEleves() ?? [])
      .filter(e => e.id_classe === id && e.statut === 'actif').length;
  }

  classeSelectionneeEstPleine = computed(() => {
    const id = this.nouvelleClasse.value;
    if (!id) return false;
    const classe = (this.cache.getClasses() ?? []).find(c => c.id_classe === id);
    return classe ? this.effectif(id) >= classe.effectif_max : false;
  });

  async confirmer(): Promise<void> {
    const newClasseId = this.nouvelleClasse.value;
    if (!newClasseId) return;

    // Met à jour l'élève avec la nouvelle classe
    const eleveModifie: Eleve = {
      ...this.data.eleve,
      id_classe: newClasseId,
    };

    // Mise à jour cache + queue (rowIndex = 0 car inconnu ici, à améliorer en prod)
    await this.data_s.updateEleve(eleveModifie);

    this.snack.open('Élève transféré avec succès', 'OK', { duration: 3000 });
    this.dialogRef.close(eleveModifie);
  }
}
