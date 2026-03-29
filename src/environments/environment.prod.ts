// environment.prod.ts — valeurs de production (à ne jamais commiter avec les vraies clés)
export const environment = {
  production: true,
  spreadsheetId:             process.env['SPREADSHEET_ID'] ?? '',
  googleServiceAccountEmail: process.env['GOOGLE_SA_EMAIL'] ?? '',
  googlePrivateKey:          process.env['GOOGLE_PRIVATE_KEY'] ?? '',
  callMeBotApiKey:           process.env['CALLMEBOT_KEY'] ?? '',
  whatsappTemplate:
    'Bonjour, le solde scolaire de {nom_eleve} (classe : {classe}) est de {montant} FCFA restant. Merci.',
};
