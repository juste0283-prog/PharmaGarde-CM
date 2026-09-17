# PharmaGarde CM

**Trouver les pharmacies de garde ouvertes près de chez soi, partout au Cameroun.**

PharmaGarde CM référence les pharmacies de garde des chefs-lieux de région et permet à chacun de
trouver la pharmacie ouverte la plus proche et la plus fiable : liste par ville, carte interactive,
itinéraire et signalement des incohérences.

> Statut : prototype fonctionnel. Les données de référence sont issues d'un jeu de démonstration
> (seed) et doivent être enrichies par la communauté et les pharmaciens.

---

## Fonctionnalités

- **Mode national et par ville** : vue globale sur les 10 chefs-lieux de région, ou vue ciblée sur
  une ville.
- **Liste groupée par ville** : pour chaque ville, l'en-tête indique la région et le nombre de
  pharmacies à garde active, avec le nom de **tous ses quartiers** puis les cartes de pharmacie.
- **Carte intégrée (Leaflet / OpenStreetMap)** :
  - marqueurs des 10 chefs-lieux (popup : région, liste des quartiers, bouton « Voir les pharmacies ») ;
  - points de quartiers (infobule au survol) ;
  - pastilles numérotées des pharmacies et de leur statut de fiabilité ;
  - pastille « Votre position » (géolocalisation du navigateur).
- **Itinéraire intégré** : le bouton « Itinéraire » trace la ligne de départ (position ou centre-ville)
  vers la pharmacie, affiche la distance à vol d'oiseau et ouvre l'information de la pharmacie — un
  lien « Ouvrir dans Google Maps » reste disponible en repli.
- **Fiabilité communautaire** : statuts *confirmée*, *vérifiée*, *ancienne donnée*, *signalée*,
  calculés à partir des confirmations et signalements ; tri par proximité puis fiabilité.
- **Garde de nuit** : horaires affichés (« Garde de nuit : de 18h à 8h ») selon le planning du jour.
- **Filtres** : quartier (par ville), statut de fiabilité, pharmacies confirmées uniquement.

---

## Stack technique

| Couche    | Techno |
|-----------|--------|
| Frontend  | React 19, TypeScript, Vite 8, Tailwind CSS 4 |
| Cartographie | Leaflet 1.9 (OpenStreetMap) |
| Données   | SQLite locale exécutée dans le navigateur via sql.js (WASM), aucun serveur requis |
| Backend   | Node.js, Express, TypeScript — socle minimal (API Roadmap v2) |

Le site est **100 % statique** : la base SQLite et le moteur WASM sont servis avec les bundles, tout
se passe côté navigateur.

---

## Arborescence du dépôt

```
PharmaGarde_CM/
├── frontend/                 # Application web (module fonctionnel)
│   ├── public/
│   │   ├── db/
│   │   │   ├── pharmagarde.db    # Base SQLite générée par le seed
│   │   │   └── sql-wasm.wasm     # Moteur SQLite pour navigateur (sql.js)
│   │   └── favicon.svg
│   ├── scripts/seed-db.mjs       # Génération de la base de démonstration
│   └── src/
│       ├── components/           # Header, Hero, FiltersBar, ResultsView, PharmacyMap,
│       │                         # PharmacyCard, Reliability, HowItWorks, ReportCta, Footer
│       ├── data/pharmacies.ts    # Types (City, QuartierPoint, Pharmacy) et constantes
│       ├── db/database.ts        # Chargement SQLite + WASM
│       ├── db/queries.ts         # Requêtes (villes, pharmacies, plannings, points de quartier)
│       └── hooks/usePharmacyData.ts
├── backend/                 # API Node/Express (squelette en cours de construction)
│   └── src/index.ts
├── docs/                    # Cahier des charges, roadmap et workflow (PDF)
└── README.md
```

---

## Démarrage rapide

Prérequis : **Node.js 18 ou supérieur** (npm inclus).

### Frontend (application principale)

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

La base de données est régénérée automatiquement avant `dev` et `build` (hooks `predev`/`prebuild`).
Pour la regénérer manuellement :

```bash
npm run db:seed
```

Production :

```bash
npm run build      # TypeScript + Vite → dist/
npm run preview    # sert le build localement
```

### Backend (API, socle)

```bash
cd backend
npm install
cp .env.example .env   # ajuster PORT et MONGO_URI selon le besoin
npm run dev            # ts-node-dev, port 5000 par défaut
```

---

## Base de données

Schéma SQLite (fichier `frontend/public/db/pharmagarde.db`) :

| Table           | Rôle                                              |
|-----------------|---------------------------------------------------|
| `cities`        | Villes couvertes (chefs-lieux de région), coordonnées |
| `pharmacies`    | Nom, ville, quartier, adresse, téléphone, coordonnées, source |
| `duty_schedules`| Horaires de garde (début/fin) par pharmacie        |
| `confirmations` | Confirmations communautaires de la disponibilité   |
| `reports`       | Signalements d'incohérence (fermée, occupée…)      |

Par défaut, le jeu de données seed contient :

- **10 villes** (chefs-lieux des 10 régions du Cameroun : Yaoundé, Douala, Bafoussam, Bamenda,
  Bertoua, Buea, Ebolowa, Garoua, Maroua, Ngaoundéré) ;
- **30 pharmacies** réparties entre les villes (dont doublons possibles entre villes, gérés par une
  clé composée `ville::nom`) ;
- **210 plannings de garde**, **30 confirmations**, **3 signalements** ;
- les **points de quartier** sont dérivés en requête (coordonnées moyennes des pharmacies d'un même
  quartier).

---

## Fiabilité et statuts

Le statut d'une pharmacie est déduit de ses confirmations et signalements :

- **Confirmée** : dernière confirmation récente, fiable ;
- **Vérifiée** : donnée vérifiée, à surveiller ;
- **Ancienne donnée** : non confirmée depuis longtemps ;
- **Signalée** : au moins un signalement d'incohérence.

Les sections de la liste de résultats, triées par distance (quand la position est connue) puis par
fiabilité, indiquent l'origine de la donnée et sa date de dernière mise à jour.

---

## Scripts utiles

| Commande               | Description                              |
|------------------------|------------------------------------------|
| `npm run db:seed`      | (frontend) régénère `pharmagarde.db`      |
| `npm run dev`          | (frontend) serveur de développement Vite  |
| `npm run build`        | (frontend) compilation TypeScript + Vite  |
| `npm run preview`      | (frontend) sert le build en local         |
| `npm run dev`          | (backend) API Express en rechargement     |
| `npm run build/start`  | (backend) compilation et lancement TS→JS  |

---

## Contribution

- Développement sur des branches thématiques (ex. `feature/pharmacies`), intégrées à `main` par
  pull request.
- Commits et messages en français, descriptifs.
- Les sources de données (planning des gardes) restent à fiabiliser avec les pharmaciens partenaires.

---

## Documents projet

Les documents de cadrage sont disponibles dans [`docs/`](docs/) :

- [`PharmaGarde_CM_Cahier_des_Charges_v2`](docs/PharmaGarde_CM_Cahier_des_Charges_v2%20(1).pdf) — cahier des charges ;
- [`PharmaGarde_CM_Roadmap_v2`](docs/PharmaGarde_CM_Roadmap_v2.pdf) — feuille de route ;
- [`PharmaGarde_CM_Workflow_v2`](docs/PharmaGarde_CM_Workflow_v2.pdf) — workflow produit.