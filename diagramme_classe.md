┌─────────────────────────────────────────────────────────────────────────────┐
│                              MODÈLES MÉTIER                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐          ┌──────────────┐         ┌──────────────────┐
│   AppUser    │          │    Famille   │         │      Eleve       │
├──────────────┤     1    ├──────────────┤   0..*  ├──────────────────┤
│ id           │─────────▶│ id_famille   │────────▶│ id_eleve         │
│ username     │          │ nom_famille  │         │ id_famille (FK)  │
│ mot_de_passe │          │ tel_pere     │         │ id_classe (FK)   │
│ nom          │          │ tel_mere     │         │ nom / prenom     │
│ role: Role   │          │ montant_att. │         │ statut           │
│ is_admin     │          │ montant_red. │         │ matricule        │
│ section      │          │ annee_scol.  │         │ sequences[]      │
│ permissions[]│          ├──────────────┤         └──────────────────┘
└──────────────┘          │ paiements[]  │◀──────────────────┐
       │                  │ eleves[]     │◀──────┐           │
       │ permissions       └──────────────┘       │           │
       ▼                          │               │           │
┌─────────────────┐               │ 0..*          │           │
│  PermissionUser │               ▼               │           │
├─────────────────┤        ┌──────────────┐       │           │
│ id              │        │   Paiement   │       │           │
│ user_id (FK)    │        ├──────────────┤       │           │
│ permission_id   │        │ id_paiement  │       │           │
│ date_assign.    │        │ id_famille   │───────┘           │
└─────────────────┘        │ montant_v.   │                   │
                           │ date_paiem.  │                   │
                           │ mode_paiem.  │                   │
                           │ date_rdv     │                   │
                           │ recu_numero  │                   │
                           └──────────────┘                   │
                                                              │
┌──────────────┐     1     ┌──────────────────┐              │
│    Classe    │──────────▶│  MatiereConfig   │              │
├──────────────┤   0..*    ├──────────────────┤              │
│ id_classe    │           │ id_matiere       │              │
│ nom_classe   │           │ nom_matiere      │              │
│ niveau       │           │ id_classe (FK)   │              │
│ cycle:Section│           │ coefficient      │              │
│ effectif_max │           │ groupe           │              │
│ annee_scol.  │           │ id_enseignant FK │              │
│ enseignant_p │           └──────────────────┘              │
│ eleves[]     │─────────────────────────────────────────────┘
│ matieres[]   │
└──────────────┘
       │ 1
       │
       ▼ 0..*
┌──────────────┐     1     ┌──────────────┐
│  Enseignant  │──────────▶│     Note     │
├──────────────┤   0..*    ├──────────────┤
│ id_enseignant│           │ id_note      │
│ nom / prenom │           │ id_eleve FK  │
│ tel / email  │           │ id_classe FK │
│ classes_ass. │           │ matiere      │
└──────────────┘           │ sequence     │
                           │ note_obtenue │
                           └──────────────┘

┌──────────────┐        ┌──────────────┐       ┌──────────────┐
│   Absence    │        │  MsgTemplate │       │  LogAlerte   │
├──────────────┤        ├──────────────┤       ├──────────────┤
│ id           │        │ id_template  │       │ id_log       │
│ id_enfant FK │        │ type         │       │ id_eleve FK  │
│ id_famille FK│        │ objet        │       │ id_famille FK│
│ id_classe FK │        │ contenu      │       │ id_template  │
│ date / heure │        │ variables_d. │       │ numero_dest  │
│ justifie     │        │ actif        │       │ date_envoi   │
│ motif        │        │ langue       │       │ statut       │
└──────────────┘        │ destinataire │       │ hash_dedup   │
                        └──────────────┘       └──────────────┘

┌──────────────┐        ┌──────────────┐
│  SoldeSnap   │        │ BulletinSnap │
├──────────────┤        ├──────────────┤
│ id_eleve FK  │        │ id_eleve FK  │
│ id_famille FK│        │ id_classe FK │
│ total_verse  │        │ sequence     │
│ montant_att. │        │ moy_ponderee │
│ reste_a_pay. │        │ rang         │
│ statut_insol.│        │ mention      │
│ dernier_paie.│        │ moy_classe   │
└──────────────┘        └──────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                              SERVICES                                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         CacheService                            │
├─────────────────────────────────────────────────────────────────┤
│ SIGNAUX BRUTS (privés)                                          │
│  _familles     signal<Famille[]>                                │
│  _classes      signal<Classe[]>                                 │
│  _eleves       signal<Eleve[]>                                  │
│  _paiements    signal<Paiement[]>                               │
│  _notes        signal<Note[]>                                   │
│  _absences     signal<Absence[]>                                │
│  _templates    signal<MsgTemplate[]>                            │
│  _logs         signal<LogAlerte[]>                              │
│  _users        signal<AppUser[]>                                │
│  _section      signal<Section|'all'>                            │
├─────────────────────────────────────────────────────────────────┤
│ COMPUTED N1                                                     │
│  _notesIndex            computed (Map matière→note)             │
│  _paiementsParFamille   computed (Map id_famille→Paiement[])    │
├─────────────────────────────────────────────────────────────────┤
│ COMPUTED N2                                                     │
│  _elevesEnrichis        computed (Eleve + famille + classe)     │
├─────────────────────────────────────────────────────────────────┤
│ COMPUTED N3                                                     │
│  _famillesEnrichies     computed (Famille + eleves + paiements) │
│  _matieresEnrichies     computed (Matiere + enseignant + classe) │
├─────────────────────────────────────────────────────────────────┤
│ COMPUTED N4                                                     │
│  _classesEnrichies      computed → filtre par _section          │
│                         (Classe + eleves + matieres)            │
├─────────────────────────────────────────────────────────────────┤
│ MAPS O(1)                                                       │
│  famillesMap    computed<Map<string,Famille>>                   │
│  classesMap     computed<Map<string,Classe>>                    │
│  matieresMap    computed<Map<string,MatiereConfig>>             │
├─────────────────────────────────────────────────────────────────┤
│ API PUBLIQUE                                                    │
│  getFamilles / setFamilles / upsertFamille / removeFamille      │
│  getClasses  / setClasses  / upsertClasse                       │
│  getEleves   / setEleves   / upsertEleve                        │
│  getPaiements/ setPaiements/ upsertPaiement                     │
│  getNotes    / setNotes    / setNotesBatch / deleteNotesBatch   │
│  getAbsences / setAbsences / addAbsence / addAbsencesBatch      │
│  getTemplates/ setTemplates/ upsertTemplate                     │
│  getLogs     / setLogs     / upsertLog                          │
│  getUsers    / setUsers    / upsertUser / removeUser            │
│  setSection(s) / invalidateAll()                                │
└─────────────────────────────────────────────────────────────────┘
         ▲                         ▲
         │ lit/écrit               │ lit/écrit
         │                         │
┌────────┴────────┐      ┌─────────┴────────┐
│   DataService   │      │   AuthService    │
├─────────────────┤      ├──────────────────┤
│ DÉPENDANCES     │      │ DÉPENDANCES      │
│  CacheService   │      │  CacheService    │
│  SheetsQueue    │      │  DataService     │
│  GoogleSheets   │      │  Router          │
├─────────────────┤      ├──────────────────┤
│ initAppData()   │      │ login():Promise  │
│ invalidateCache │      │ logout()         │
│ refreshXxx()    │      │ hasPermission()  │
│ addXxx()        │      │ hasRole()        │
│ updateXxx()     │      │ setSection()     │
│ deleteXxx()     │      │ getSectionActive │
│ loadTemplates() │      │ isAdmin computed │
│ loadLogs()      │      │ isLogged computed│
│ loadUsers()     │      │ user readonly    │
│ addLog()        │      │ section readonly │
└─────────────────┘      └──────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SheetsQueueService                           │
├─────────────────────────────────────────────────────────────────┤
│ queue     signal<QueueItem[]>                                   │
│ online    signal<boolean>                                       │
│                                                                 │
│ enqueue(payload, order)   → ajoute en fin de file              │
│ dequeue()                 → retire le premier                   │
│ peek()                    → lit sans retirer                    │
│ size() / isEmpty()                                              │
│ clearQueue()              → vide + purge localStorage           │
│ sync()                    → envoie le premier à GoogleSheets    │
│ startScheduler()          → interval auto toutes les 2s        │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GoogleSheetsService                          │
├─────────────────────────────────────────────────────────────────┤
│ batchGet(ranges)          → lecture multi-plages               │
│ fetchRaw(sheetName)       → lecture d'une feuille              │
│ appendRow(sheet, data)    → ajout ligne                        │
│ updateRow(sheet, row, data) → mise à jour ligne                │
│ deleteRow(sheet, rowIndex)  → suppression                      │
│ findRowById(sheet, id)    → cherche la ligne d'un id           │
│ createSheet({name, headers}) → crée la feuille si absente      │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                            PDF SERVICES                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐      ┌──────────────────────┐
│   BulletinPdfService │      │ InsolvablesPdfService │
├──────────────────────┤      ├──────────────────────┤
│ genererBulletin()    │      │ genererListe()        │
│ genererBulletins     │      │ apercu()              │
│   Classe()           │      │ buildDoc() privé      │
│ genererPV()          │      │ entete() privé        │
│ genererFicheSaisie() │      │ tableau() privé       │
│ apercu()             │      │ signatures() privé    │
│ telecharger()        │      │ cell() privé          │
└──────────────────────┘      └──────────────────────┘
           │ utilise
           ▼
  bulletin-sections.ts (fonctions pures)
  ├─ sectionBandeVerticale()
  ├─ sectionEntete()
  ├─ sectionTitreBulletin()
  ├─ sectionInfoEleve()
  ├─ sectionTableauHeader()
  ├─ sectionGroupe()
  ├─ sectionTotalGroupe()
  ├─ sectionTotauxGlobaux()
  ├─ sectionRecap()
  ├─ calcDims()
  ├─ sectionPVEntete()
  ├─ sectionPVTableau()
  ├─ sectionPVSignatures()
  └─ sectionFicheSaisie()


┌─────────────────────────────────────────────────────────────────────────────┐
│                            COMPOSANTS                                       │
└─────────────────────────────────────────────────────────────────────────────┘

Layout
├── HeaderComponent      (bascule section, queue, reload, avatar)
├── SidebarComponent     (nav filtrée par permission)
└── RouterOutlet
    ├── Auth
    │   └── LoginComponent
    │
    ├── Familles
    │   ├── FamillesListComponent   (signal filtres)
    │   ├── FamilleDetailComponent  (carte + paiements)
    │   ├── FamilleModalComponent   (création/modif)
    │   └── FamilleMapComponent     (Leaflet OSM)
    │
    ├── Élèves
    │   ├── ElevesListComponent
    │   └── EleveModalComponent
    │
    ├── Classes
    │   ├── ClassesListComponent    (modal intégré)
    │   └── ClasseModalComponent
    │
    ├── Paiements
    │   ├── PaiementsListComponent
    │   └── PaiementModalComponent → RecuPrintModalComponent
    │
    ├── Insolvables
    │   └── InsolvablesListComponent (checkboxes + template WA)
    │
    ├── Notes
    │   ├── NotesSaisieComponent
    │   └── BulletinsComponent      (PDF + WA moyennes)
    │       └── BulletinConfigModal
    │
    ├── Absences
    │   ├── AbsencesSaisieComponent (grille ↔ liste)
    │   └── AbsencesListComponent   (filtres + WA)
    │
    ├── WhatsApp
    │   ├── TemplatesListComponent  (modal intégré)
    │   ├── TemplateFormComponent   (modal)
    │   └── AlertesLogComponent     (4 filtres signal)
    │
    └── Users
        ├── UsersListComponent
        └── UserModalComponent      (permissions checkboxes)


┌─────────────────────────────────────────────────────────────────────────────┐
│                              GUARDS                                         │
└─────────────────────────────────────────────────────────────────────────────┘

authGuard  →  isLogged() ?  ✓  :  /auth/login
permGuard  →  hasPermission(route.data.perm) ?  ✓  :  /dashboard
adminGuard →  isAdmin() ?  ✓  :  /dashboard


┌─────────────────────────────────────────────────────────────────────────────┐
│                           UTILITAIRES                                       │
└─────────────────────────────────────────────────────────────────────────────┘

crypto.utils.ts
  hash(value)          → bcrypt.hashSync(value, 10): string
  compare(val, hashed) → bcrypt.compareSync(val, hashed): boolean

data.service.ts (exports)
  concatStrings(arr[])  → arr.join(',')
  deconcatString(s)     → s.split(',')