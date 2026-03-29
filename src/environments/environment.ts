// environment.ts — valeurs de développement
export const environment = {
  production: false,
  spreadsheetId:          'VOTRE_SPREADSHEET_ID_ICI',
  googleServiceAccountEmail: 'votre-compte@votre-projet.iam.gserviceaccount.com',
  googlePrivateKey:       '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n',
  callMeBotApiKey:        'VOTRE_CLE_CALLMEBOT',
  // Template de message par défaut (si F7 vide)
  whatsappTemplate:
    'Bonjour, le solde scolaire de {nom_eleve} (classe : {classe}) est de {montant} FCFA restant. Date : {date}. Merci.',
};
