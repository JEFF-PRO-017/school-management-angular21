// parent-portal/sheet-tampon.constants.ts
// Noms des feuilles tampon et leurs en-têtes de colonnes

export const SHEET_TAMPON = {
  familles:  'T1_FAMILLE_TAMPON',
  eleves:    'T2_ELEVE_TAMPON',
  pensions:  'T3_PENSION_TAMPON',
  paiements: 'T4_PAIEMENT_DEMANDE',
} as const;

export const H_TAMPON = {
  familles: [
    'id_famille', 'nom_famille', 'tel_pere', 'tel_mere', 'tel_autre',
    'adresse_texte', 'date_enregistrement', 'statut_validation',
  ],
  eleves: [
    'id_eleve', 'id_famille', 'id_classe', 'nom', 'prenom',
    'date_naissance', 'sexe', 'statut',
    'date_enregistrement', 'statut_validation',
  ],
  pensions: [
    'id', 'id_famille', 'montant_total_attendu', 'annee_scolaire',
    'montant_reduction', 'commentaire', 'date_enregistrement', 'statut_validation',
  ],
  paiements: [
    'id', 'id_famille', 'montant', 'mode_paiement', 'reference',
    'commentaire', 'date_demande', 'statut',
  ],
} as const;