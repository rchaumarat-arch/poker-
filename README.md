# Poker Tracker

Application web pour gérer des parties de poker entre amis — un "Tricount inversé" pour suivre les mises, recaves, gains et remboursements.

## Fonctionnalités

- **Groupes d'amis** — créez des groupes, gérez les membres, renommez
- **Parties** — créez des parties par date, sélectionnez les joueurs présents parmi les membres du groupe
- **Mises & Recaves** — saisissez la mise initiale et ajoutez plusieurs recaves par joueur
- **Résultats** — saisissez le montant récupéré par chaque joueur, validation automatique de l'équilibre
- **Remboursements optimaux** — calcul automatique du plan de remboursement minimal
- **Soldes cumulés** — suivi du bilan global par joueur sur plusieurs parties
- **Règlement** — marquez les soldes comme réglés avec un historique complet
- **Persistance** — données sauvegardées en `localStorage`
- **Export / Import** — sauvegardez vos données en JSON

## Lancer le projet

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:5173](http://localhost:5173)

## Build de production

```bash
npm run build
npm run preview
```

## Stack technique

- **React 18** + **TypeScript**
- **Vite** — build tool
- **Tailwind CSS** — styling
- **React Router v6** — navigation
- **localStorage** — persistance locale (aucun backend)

## Structure du projet

```
src/
├── types/index.ts          # Types TypeScript (Player, Group, Game, ...)
├── store/AppContext.tsx     # État global + reducer + persistance
├── utils/
│   ├── calculations.ts     # Algorithmes (soldes, remboursements optimaux)
│   ├── formatters.ts       # Formatage monnaie/dates
│   └── demoData.ts         # Données de démonstration
├── components/
│   ├── common/             # Modal, Button, Input, Badge, ConfirmDialog
│   └── layout/Layout.tsx   # Layout principal
└── pages/
    ├── HomePage.tsx        # Liste des groupes + gestion joueurs
    ├── GroupPage.tsx       # Groupe (parties, soldes, historique)
    └── GamePage.tsx        # Détail partie (mises, recaves, résultats)
```

## Règles métier

- La somme des montants finaux **doit être égale** à la somme totale investie
- Le gain net d'un joueur = montant récupéré − total investi (mise initiale + recaves)
- Le bouton "Régler" archive le solde courant sans modifier l'historique des parties
- L'algorithme de remboursements utilise une méthode greedy optimale (débiteur max → créditeur max)
