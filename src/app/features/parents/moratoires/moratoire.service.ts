// moratoire.service.ts
// Service MÉTIER uniquement (aucun accès aux données) : validation, tri, id.
// La lecture des moratoires passe par ParentService.famille()?.moratoires.
// L'écriture passe par AddServices.addMoratoire / PatchServices.updateMoratoire
// (voir moratoire-services-additions.ts pour les méthodes à fusionner).

import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { Moratoire } from '../../../core/models';

@Injectable({ providedIn: 'root' })
export class MoratoireService {
  /** Génère un identifiant provisoire côté client. */
  generateId(): string {
    return `MOR-${Date.now()}`;
  }

  /** Tri par défaut : actifs d'abord, puis par date de fin la plus proche. */
  trierParStatut(liste: Moratoire[]): Moratoire[] {
    return [...(liste ?? [])].sort((a, b) => {
      const aActif = (a.statut ?? 'ACTIF') === 'ACTIF' ? 0 : 1;
      const bActif = (b.statut ?? 'ACTIF') === 'ACTIF' ? 0 : 1;
      if (aActif !== bActif) return aActif - bActif;
      return (a.date_fin ?? '').localeCompare(b.date_fin ?? '');
    });
  }
}

/**
 * Validateur de formulaire réactif : la date de fin doit être postérieure
 * à la date de début. Exporté à part pour rester réutilisable sans DI.
 */
export function dateFinApresDebutValidator(group: AbstractControl): ValidationErrors | null {
  const debut = group.get('date_debut')?.value;
  const fin = group.get('date_fin')?.value;
  if (!debut || !fin) return null;
  return new Date(fin) > new Date(debut) ? null : { dateFinInvalide: true };
}