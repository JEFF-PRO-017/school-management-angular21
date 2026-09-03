// paiement.service.ts
// Service MÉTIER uniquement (aucun accès aux données).
// Lecture : ParentService.famille()?.paiements.
// Écriture : AddServices.addPaiement (déjà existant, aucune addition requise).

import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PaiementService {
  /** Génère un identifiant provisoire côté client. */
  generateId(): string {
    return `PAI-${Date.now()}`;
  }

  /** Formatage monétaire cohérent dans toute l'application (défensif si valeur absente). */
  formatMontant(montant: number | null | undefined): string {
    const valeur = montant ?? 0;
    return `${new Intl.NumberFormat('fr-FR').format(valeur)} FCFA`;
  }

  /** Tri par défaut : plus récents d'abord. */
  trierParDate(liste: { date_paiement?: string }[]): any[] {
    return [...(liste ?? [])].sort((a, b) => (b.date_paiement ?? '').localeCompare(a.date_paiement ?? ''));
  }
}