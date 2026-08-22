// features/paiements/modal/recu-paiement.config.ts
import { PaiementEnrichi } from '../../../core/models';
import { EnfantLigne, RecuBonConfig, ECOLE_DEFAUT } from './recu-pdf.service';

export interface RecuPaiementExtra {
  enfants: EnfantLigne[];       // liste des enfants de la famille (nom + classe)
  montantVerseTotal: number;    // montant déjà versé (toutes échéances confondues)
  montantRestant: number;
  numeroParent?: string;        // si absent, dérivé de id_famille
}

export function configRecuPaiement(p: PaiementEnrichi, extra: RecuPaiementExtra): RecuBonConfig {
  const [date, heure] = new Date(p.date_paiement).toString() !== 'Invalid Date'
    ? [p.date_paiement, new Date().toTimeString().slice(0, 5)]
    : [p.date_paiement, '—'];

  return {
    ecole: ECOLE_DEFAUT,
    idRecu: p.recu_numero,
    numeroParent: extra.numeroParent ?? p.id_famille,
    nomFamille: p.famille.nom_famille,
    enfants: extra.enfants,
    montantPaiement: p.montant_verse,
    montantVerseTotal: extra.montantVerseTotal,
    montantRestant: extra.montantRestant,
    datePaiement: date,
    heurePaiement: heure,
  };
}