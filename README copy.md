# Gestion Scolaire — Angular 21 + Google Sheets + Electron

## Architecture

```
src/app/
  core/
    models/index.ts           — Tous les types TypeScript
    services/
      cache.service.ts        — Store signal en mémoire (TTL, upsert local)
      data.service.ts         — batchGet + CRUD + patch cache immédiat
      auth.service.ts         — Connexion + rôles (signal-based)
      pdf.service.ts          — jsPDF pour insolvables et bulletins
      whatsapp.service.ts     — Envoi via CallMeBot + anti-doublon
      snapshot.service.ts     — Regénération F9_SNAP / F11_SNAP
      sheets-queue.service.ts — File d'attente hors-ligne (fourni)
      @google-sheets/         — Service API Sheets (fourni)
    guards/                   — auth.guard + role.guard
    interceptors/             — auth.interceptor
  shared/components/
    layout/                   — Coque sidebar + header
    header/                   — Barre top + indicateur queue
    sidebar/                  — Navigation par rôle
    loading-spinner/          — Spinner Material
    empty-state/              — État vide réutilisable
    confirm-dialog/           — Dialog confirmation Material
  features/                   — Tous lazy-loadés
    auth/                     — Login (FormControl)
    dashboard/                — Indicateurs + actions rapides
    familles/                 — Liste + formulaire + carte Leaflet
    eleves/                   — Liste + formulaire
    classes/                  — Liste (cards) + formulaire
    paiements/                — Liste avec historique + formulaire
    notes/                    — Saisie tableau (enseignant) + bulletins
    insolvables/              — Liste + export PDF + alertes WhatsApp
    whatsapp/                 — Templates + journal des envois
```

## Installation

```bash
npm install
```

## Configuration

Éditer `src/environments/environment.ts` :

```typescript
export const environment = {
  spreadsheetId:             'VOTRE_ID_SPREADSHEET',
  googleServiceAccountEmail: 'compte@projet.iam.gserviceaccount.com',
  googlePrivateKey:          '-----BEGIN PRIVATE KEY-----\n...',
  callMeBotApiKey:           'VOTRE_CLE_CALLMEBOT',
};
```

## Lancer en développement

```bash
npm start              # Angular dev server sur :4200
npm run electron:dev   # Angular + Electron simultanément
```

## Build production

```bash
npm run build          # Build Angular dans dist/
npm run electron       # Build + Electron
```

## Rôles utilisateur

| Rôle        | Dashboard | Familles | Élèves | Paiements | Notes | Insolvables | WhatsApp |
|-------------|:---------:|:--------:|:------:|:---------:|:-----:|:-----------:|:--------:|
| admin       | ✅        | ✅       | ✅     | ✅        | ✅    | ✅          | ✅       |
| caissier    | ✅        | —        | —      | ✅        | —     | ✅          | —        |
| enseignant  | ✅        | —        | —      | —         | ✅    | —           | —        |

## Feuilles Google Sheets à créer

| Feuille       | Description                    | Groupe cache   |
|---------------|--------------------------------|----------------|
| F1_FAMILLES   | Référentiel familles + GPS     | A — 24h        |
| F2_ELEVES     | Élèves inscrits                | B — session    |
| F3_CLASSES    | Classes et niveaux             | A — 24h        |
| F4_PAIEMENTS  | Transactions (à la demande)    | C — jamais     |
| F5_FRAIS_CONFIG | Montants et échéances        | A — 24h        |
| F6_2026       | Notes année courante           | C — jamais     |
| F7_MSG_TEMPLATES | Templates WhatsApp          | A — 24h        |
| F8_LOG_ALERTES | Journal des envois WhatsApp   | —              |
| F9_SNAP       | Snapshot soldes (figé)         | D — session    |
| F10_ENSEIGNANTS | Référentiel enseignants      | A — 24h        |
| F11_SNAP      | Snapshot bulletins (figé)      | D — session    |
| F12_MATIERES_CONFIG | Matières + coefficients  | A — 24h        |

## Stratégie cache (résumé)

- **Démarrage** : 2 appels `batchGet` → toutes les données prêtes en ~1 s
- **Écriture** : mise à jour cache local **immédiate** + envoi en file d'attente
- **Hors-ligne** : la queue persiste dans `localStorage`, se synchronise dès reconnexion
- **Snapshots** : regénérés manuellement par l'admin via bouton dans l'app

## WhatsApp — CallMeBot

1. Envoyer "I allow callmebot to send me messages" au numéro +34 644 597 230
2. Recevoir la clé API par retour
3. La saisir dans `environment.callMeBotApiKey`

## Leaflet — OpenStreetMap

Aucune clé API requise. Les tuiles sont chargées depuis `tile.openstreetmap.org`.
Centre par défaut : Yaoundé (3.848, 11.502) — modifiable dans `famille-form.component.ts`.
