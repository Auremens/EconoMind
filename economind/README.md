# EconoMind 💰

Application web PWA de gestion de budget pour couple — mobile-first, intelligente, 100% locale.

---

## ✨ Fonctionnalités

- **Dashboard** : reste à vivre en 5 secondes, alertes, projection 6 mois
- **Transactions** : ajout manuel, filtres, modification, suppression
- **Import CSV** : normalisation auto, déduplication intelligente
- **Analyse** : charts, budget 50/30/20 ou custom, simulation, projection
- **Objectifs d'épargne** : suivi avec progression et alerte échéance
- **PWA** : installable sur Android, mode offline
- **Dark mode** : toggle + respect préférence système
- **Export/Import JSON** : sauvegarde et restauration complètes
- **Catégorisation auto** : apprentissage depuis tes corrections

---

## 🚀 Démarrage rapide

### Prérequis
- Node.js 18+
- npm 9+

### Installation

```bash
# 1. Cloner / dézipper le projet
cd economind

# 2. Installer les dépendances
npm install

# 3. Lancer en développement
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000)

### Build production

```bash
npm run build
npm start
```

---

## 📱 Installation PWA (Android)

1. Ouvre l'app dans Chrome mobile
2. Appuie sur le bouton **"Installer EconoMind"** (banner en haut)
3. Ou via le menu Chrome → "Ajouter à l'écran d'accueil"
4. L'app se lance en mode standalone, sans barre de navigation

---

## 🌐 Déploiement Vercel

```bash
# Option 1 : CLI Vercel
npm i -g vercel
vercel

# Option 2 : GitHub
# Push sur GitHub → connecter repo sur vercel.com → déploiement auto
```

---

## 🗂️ Structure du projet

```
economind/
├── public/
│   ├── manifest.json          # PWA manifest
│   └── icons/                 # Icônes app
├── scripts/
│   └── generate-icons.js      # Génération icônes PNG
├── src/
│   ├── context/
│   │   └── AppContext.tsx      # État global + localStorage
│   ├── lib/
│   │   ├── store.ts            # Types, localStorage, export/import
│   │   ├── analytics.ts        # Calculs, projections, suggestions
│   │   └── csvImport.ts        # Parser CSV, déduplication
│   ├── components/
│   │   └── Layout.tsx          # Layout global + nav
│   ├── pages/
│   │   ├── index.tsx           # Dashboard
│   │   ├── transactions.tsx    # Gestion transactions
│   │   ├── import.tsx          # Import CSV
│   │   ├── objectifs.tsx       # Objectifs d'épargne
│   │   └── analyse.tsx         # Analyse & simulation
│   └── styles/
│       └── globals.css         # Styles globaux Tailwind
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

---

## 📊 Format CSV accepté

L'import CSV accepte les exports standards des banques françaises.

Colonnes détectées automatiquement (insensible à la casse) :

| Type | Mots-clés reconnus |
|------|--------------------|
| Date | `date`, `dat` |
| Libellé | `libel`, `opéra`, `motif`, `label` |
| Montant | `montant`, `amount` |
| Débit/Crédit | `débit`, `crédit` |

**Formats de date acceptés** : `dd/mm/yyyy`, `yyyy-mm-dd`, `dd-mm-yyyy`

**Formats de montant** : `1 234,56` ou `1234.56` ou `-456,78`

### Banques compatibles testées
- BNP Paribas
- Crédit Agricole
- Société Générale
- La Banque Postale
- LCL
- CIC

---

## 💾 Données

Toutes les données sont stockées dans `localStorage` — aucun serveur, aucun compte.

### Sauvegarde manuelle
- Cliquer sur l'icône ⬇️ dans le header → télécharge `economind-backup-YYYY-MM-DD.json`
- Un rappel apparaît automatiquement tous les 7 jours

### Restauration
- Cliquer sur l'icône ⬆️ dans le header → sélectionner le fichier JSON

---

## 🔧 Génération des icônes PWA

```bash
# Installer sharp (uniquement pour la génération d'icônes)
npm install sharp --save-dev

# Générer les PNG depuis le SVG
node scripts/generate-icons.js
```

Les fichiers `icon-192.png` et `icon-512.png` sont créés dans `public/icons/`.

---

## 🧠 Logique métier

### Catégorisation automatique
- Basée sur des mots-clés dans `DEFAULT_CATEGORY_RULES` (src/lib/store.ts)
- Apprentissage : chaque modification de catégorie par l'utilisateur crée une nouvelle règle persistée en localStorage
- Les règles utilisateur ont priorité sur les règles par défaut

### Déduplication CSV
| Score | Niveau | Action |
|-------|--------|--------|
| Montant ±0€, date ±0j, similarité >90% | 🟢 Auto | Fusion automatique |
| Montant ±2€, date ±3j, similarité >70% | 🟠 Doute | L'utilisateur choisit |
| Similarité <60% | 🔴 Ignore | Transaction distincte |

Priorité source : CSV > PDF > Manuel

### Projections
Basées sur la moyenne des 6 derniers mois de solde (revenus - dépenses).

---

## 📝 Personnalisation

### Ajouter des comptes
Modifier `DEFAULT_ACCOUNTS` dans `src/lib/store.ts`

### Ajouter des catégories
Modifier `DEFAULT_CATEGORIES` dans `src/lib/store.ts`

### Ajouter des règles de catégorisation
Modifier `DEFAULT_CATEGORY_RULES` dans `src/lib/store.ts`

---

## 📋 Stack technique

| Technologie | Usage |
|-------------|-------|
| Next.js 14 | Framework React + routing |
| Tailwind CSS | Styles utility-first |
| Recharts | Graphiques (bar, area, pie, line) |
| PapaParse | Parsing CSV côté client |
| next-pwa | Service Worker + manifest PWA |
| localStorage | Persistance des données |

---

## License

Usage personnel — aucune licence commerciale.
