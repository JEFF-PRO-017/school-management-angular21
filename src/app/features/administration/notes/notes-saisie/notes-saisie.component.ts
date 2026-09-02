// notes-saisie.component.ts
//
// LOGIQUE PRINCIPALE :
//   - 1 séquence sélectionnée  → tableau éditable (saisie/modif)
//   - 2+ séquences             → toutes les notes visibles en lecture seule,
//                                 colonne "Moy. seq." par séquence,
//                                 colonne "Moy. trim." finale à droite
//
// OPTIMISATIONS :
//   - Données lues depuis le cache DataService (synchrone, zéro réseau)
//   - Squelette CSS shimmer pendant la construction du tableau
//   - Seules les cellules réellement modifiées sont envoyées (PATCH minimal)
//   - ChangeDetectionStrategy.OnPush

import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, ChangeDetectorRef,
  effect,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../../../core/services/auth.service';
import { Note, Sequence, Eleve, MatiereConfig, SEQUENCES } from '../../../../core/models/last_index';
import { TransfertEleveDialogComponent } from '../transfert-eleve-dialog/transfert-eleve-dialog.component';
import { AddServices, GetServices } from '../../../../core/services/@data';
import { DeleteServices } from '../../../../core/services/@data/_delete.services';

// ── Types internes ─────────────────────────────────────────────────────────

/** Une cellule : valeur courante + valeur d'origine pour détecter les modifs */
interface Cell {
  key: string;
  valeur:string| number | null;
  origine: string| number | null;
}

/** Une ligne du tableau = un élève */
interface Ligne {
  eleve: Eleve;
  cells: Cell[][];          // [seqIndex][matiereIndex]
  moySeq: (number | null)[]; // moyenne par séquence
  moyTrim: number | null;    // moyenne trimestrielle (moyenne des moySeq)
}

@Component({
  selector: 'app-notes-saisie',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './notes-saisie.component.html',
  styleUrl: './notes-saisie.component.css'
})
export class NotesSaisieComponent implements OnInit {
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);
  private get =inject(GetServices)
  private add = inject(AddServices)
  private delete = inject(DeleteServices)

  readonly sequences: Sequence[] = SEQUENCES;
  ctrlClasse = new FormControl('');
  loading = signal(false);
  saving = signal(false);

  seqActives: Sequence[] = ['SEQ1'];
  matActives: string[] = []; // ids des matières visibles

  get isTrim(): boolean { return this.seqActives.length > 1; }

  lignes: Ligne[] = [];
  nbModif = 0;

  // ── Computed ──────────────────────────────────────────────────────────────

  classesDisponibles = computed(() => {
    const all = this.get.getClasses() ?? [];
    if (this.auth.isAdmin()) return all;
    return all.filter(c => this.auth.getClassesAssignees().includes(c.id_classe));
  });

  matieres = (): MatiereConfig[] => {
    const id = this.ctrlClasse.value;
    if (!id) return [];
    return (this.get.getClasses() ?? []).find(c => c.id_classe === id)?.matieres ?? [];
  };

  /** Sous-ensemble de matieres() actuellement actif */
  matieresActives = (() =>
    this.matieres().filter(m => this.matActives.includes(m.id_matiere))
  );

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  onChnageClasse(): void {
    const _ = this.matieres();
    this.charger()
  }

  ngOnInit(): void {
    const classes = this.classesDisponibles();
    if (classes.length) {
      this.ctrlClasse.setValue(classes[0].id_classe);
      this.charger();
    };
  }

  // ── Toggles pills ──────────────────────────────────────────────────────────

  toggleSeq(seq: Sequence): void {
    if (this.seqActives.includes(seq)) {
      if (this.seqActives.length === 1) return;
      this.seqActives = this.seqActives.filter(s => s !== seq);
    } else {
      this.seqActives = [...this.seqActives, seq]
        .sort((a, b) => SEQUENCES.indexOf(a) - SEQUENCES.indexOf(b));
    }
    if (this.lignes.length) this._recalcTout();
    this._buildLignes();
    this.cdr.markForCheck();
  }

  toggleMat(id: string): void {
    if (this.matActives.includes(id)) {
      if (this.matActives.length === 1) return; // toujours au moins 1
      this.matActives = this.matActives.filter(m => m !== id);
    } else {
      // Conserve l'ordre d'origine
      this.matActives = this.matieres()
        .map(m => m.id_matiere)
        .filter(m => this.matActives.includes(m) || m === id);
    }
    // Recalcule les moyennes (le filtre change les colonnes prises en compte)
    this.lignes.forEach(l => this._calcMoyennes(l));
    this.cdr.markForCheck();
  }

  toutesLesMatieres(): void {
    this.matActives = this.matieres().map(m => m.id_matiere);
    this.lignes.forEach(l => this._calcMoyennes(l));
    this.cdr.markForCheck();
  }

  // ── Chargement ─────────────────────────────────────────────────────────────

  async charger(): Promise<void> {
    if (!this.ctrlClasse.value) return;
    this.loading.set(true);
    this.lignes = [];
    // Active toutes les matières par défaut à chaque chargement
    this.matActives = this.matieres().map(m => m.id_matiere);
    await Promise.resolve();
    this._buildLignes();
    setTimeout(() => { this.loading.set(false); }, 1000)
    this.cdr.markForCheck();
  }

  // ── Construction ───────────────────────────────────────────────────────────

  private _buildLignes(): void {
    const idClasse = this.ctrlClasse.value!;
    const matieres = this.matieresActives();

    const eleves = (this.get.getClasses() ?? [])
      .find(c => c.id_classe === idClasse)?.eleves
      ?.slice().sort((a, b) => a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom))
      ?? [];

    this.lignes = eleves.map(eleve => {
      const cells: any[][] = this.seqActives.map(seq => {
        const notesSeq = eleve.sequences?.find(s => s.sequence === seq)?.notes_eleve ?? [];
        return matieres.map(mat => {
          const val = notesSeq.find(n => n.matiere === mat.nom_matiere)?.note_obtenue ?? null;
          return { key: `${eleve.id_eleve}_${seq}_${mat.nom_matiere}`, valeur: val, origine: val };
        });
      });
      const ligne: Ligne = { eleve, cells, moySeq: [], moyTrim: null };
      this._calcMoyennes(ligne);
      return ligne;
    });
    this.nbModif = 0;
  }

  // Recalcule tout après changement de séquences actives
  private _recalcTout(): void {
    const matieres = this.matieres();
    // Ajoute les colonnes manquantes pour les nouvelles séquences
    this.lignes.forEach((ligne) => {
      const eleve = ligne.eleve;
      ligne.cells = this.seqActives.map((seq, si) => {
        if (ligne.cells[si]) return ligne.cells[si]; // déjà chargée
        const notesSeq = eleve.sequences?.find(s => s.sequence === seq)?.notes_eleve ?? [];
        return matieres.map(mat => {
          const val = notesSeq.find(n => n.matiere === mat.nom_matiere)?.note_obtenue ?? null;
          return { key: `${eleve.id_eleve}_${seq}_${mat.nom_matiere}`, valeur: val, origine: val };
        });
      });
      this._calcMoyennes(ligne);
    });
  }

  // ── Calcul moyennes — basé sur matieresActives() uniquement ───────────────

  private _calcMoyennes(ligne: Ligne): void {
    const actives = this.matieresActives();
    ligne.moySeq = this.seqActives.map((_, si) => {
      let pts = 0, totCoeff = 0, has = false;
      actives.forEach(m => {
        const mi = this.realMatIdx(m);
        const v = ligne.cells[si]?.[mi]?.valeur;
        if (v !== null && v !== undefined) { pts += ((parseFloat(v?.toString() || '0')) * (+m.coefficient)); has = true;  }
        totCoeff += (+m.coefficient);
      });
      return has && totCoeff > 0 ? pts / totCoeff : null;
    });
    const valides = ligne.moySeq.filter((v): v is number => v !== null);
    ligne.moyTrim = valides.length ? valides.reduce((a, b) => a + b, 0) / valides.length : null;
  }

  // ── Accesseurs template ────────────────────────────────────────────────────

  /** Index réel d'une matière dans le tableau complet (pour cells[][mi]) */
  realMatIdx(m: MatiereConfig): number {
    return this.matieres().findIndex(mat => mat.id_matiere === m.id_matiere);
  }

  cellVal(ei: number, si: number, mi: number): number | null {
    const note = this.lignes[ei]?.cells[si]?.[mi].valeur;
    return note !== null && note !== undefined ? parseFloat(note.toString().replace(',', '.')) : null;
  }

  estModifiee(ei: number, si: number, mi: number): boolean {
    const c = this.lignes[ei]?.cells[si]?.[mi];
    return !!c && c.valeur !== c.origine;
  }

  // ── Saisie ─────────────────────────────────────────────────────────────────

  surSaisie(event: Event, ei: number, si: number, mi: number): void {
    const raw = (event.target as HTMLInputElement).value;
    const cell = this.lignes[ei]?.cells[si]?.[mi];
    if (!cell) return;
    cell.valeur = raw === '' ? null : +raw;
    this._calcMoyennes(this.lignes[ei]);
    this.nbModif = this._compterModifiees();
    this.cdr.markForCheck();
  }

  private _compterModifiees(): number {
    let n = 0;
    this.lignes.forEach(l => l.cells.forEach(sc => sc.forEach(c => { if (c.valeur !== c.origine) n++; })));
    return n;
  }

  // ── Enregistrement ─────────────────────────────────────────────────────────

  async enregistrer(): Promise<void> {
    const matieres = this.matieres();
    const seq = this.seqActives[0];
    const annee = new Date().getFullYear().toString();
    const idEnseignant = this.auth.user()?.id ?? '';

    const notes_delete: string[] = [];
    const notes_add: Note[] = [];
    this.lignes.forEach(ligne => {
      ligne.cells[0]?.forEach((cell, mi) => {
        if (cell.valeur === cell.origine || cell.valeur === null) return;
        const mat = matieres[mi];
        notes_add.push({
          id_note: `${ligne.eleve.id_eleve}_${seq}_${mat.nom_matiere}`,
          id_eleve: ligne.eleve.id_eleve,
          id_classe: ligne.eleve.id_classe,
          matiere: mat.nom_matiere,
          id_enseignant: idEnseignant,
          sequence: seq,
          note_obtenue: cell.valeur,
          note_sur: 20,
          annee_scolaire: annee,
        });

        if (cell.origine !== null) {
          notes_delete.push(cell.key);
        }
      });
    });

    if (!notes_add.length) { this.snack.open('Aucune modification', '', { duration: 2000 }); return; }

    this.saving.set(true);
    await this.add.saveNotesBatch(notes_add);
    await this.delete.deleteNotesBatch(notes_delete);
    this.saving.set(false);
    this.lignes.forEach(l => l.cells[0]?.forEach(c => { if (c.valeur !== c.origine && c.valeur !== null) c.origine = c.valeur; }));
    this.nbModif = 0;
    this.snack.open(`${notes_add.length} note(s) enregistrée(s)`, 'OK', { duration: 3000 });
    this.cdr.markForCheck();
  }

  // ── Transfert ──────────────────────────────────────────────────────────────

  ouvrirTransfert(eleve: Eleve): void {
    this.dialog.open(TransfertEleveDialogComponent, {
      data: { eleve }, width: '440px', maxWidth: '95vw',
    }).afterClosed().subscribe((m: Eleve | undefined) => { if (m) this.charger(); });
  }
}
