# ⬡ TalentMatch — Guide complet débutant

Moteur de matching sémantique CV ↔ Offres d'emploi, construit sur Cloudflare.

> **Pour les débutants complets** : ce guide explique chaque commande et pourquoi tu la lances.

---

## Ce qu'on va construire

```
Tu uploads un CV  →  le texte est transformé en vecteur (768 nombres)
                  →  stocké dans Cloudflare Vectorize

Tu postes une offre →  même chose

Tu lances un matching →  Vectorize compare les vecteurs par "distance cosine"
                      →  retourne les 8 offres/CVs les plus proches avec un score %
                      →  l'IA génère une explication en français
```

---

## Étape 0 — Installer les outils

Tu as besoin de :
- **Node.js** (v18+) — pour lancer le projet
- **Wrangler** — l'outil CLI de Cloudflare

```bash
# Vérifie Node.js
node --version   # doit afficher v18 ou plus

# Installe Wrangler globalement
npm install -g wrangler

# Connecte ton compte Cloudflare (ça ouvre un navigateur)
wrangler login
```

> Si tu n'as pas de compte Cloudflare : va sur https://cloudflare.com et crée un compte gratuit.

---

## Étape 1 — Télécharger le projet

```bash
# Clone ou télécharge le projet, puis entre dedans
cd talentmatch-next

# Installe les dépendances Node.js
npm install
```

---

## Étape 2 — Créer les ressources Cloudflare

### 2a. Les index Vectorize (base de données vectorielle)

```bash
# Index pour stocker les offres d'emploi
wrangler vectorize create talentmatch-jobs --dimensions=768 --metric=cosine

# Index pour stocker les CVs
wrangler vectorize create talentmatch-cvs --dimensions=768 --metric=cosine
```

> **Pourquoi 768 dimensions ?** Le modèle d'IA qu'on utilise (`bge-base-en-v1.5`) transforme chaque texte en 768 nombres. Ce sont ces 768 nombres qu'on compare.

> **Pourquoi cosine ?** C'est la méthode mathématique pour mesurer la similarité entre deux vecteurs. La "distance cosine" mesure l'angle entre deux vecteurs — angle petit = textes similaires.

---

### 2b. La base de données D1 (pour stocker les métadonnées)

```bash
wrangler d1 create talentmatch-db
```

Cette commande va afficher quelque chose comme :
```
✅ Successfully created DB 'talentmatch-db'
{
  "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",   ← COPIE CET ID
  "name": "talentmatch-db"
}
```

**⚠️ Important :** Ouvre le fichier `wrangler.toml` et remplace `REMPLACE_PAR_TON_ID` par l'ID que tu viens de copier :

```toml
# Avant :
database_id = "REMPLACE_PAR_TON_ID"

# Après (exemple) :
database_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

---

### 2c. Initialiser le schéma SQL

```bash
# Crée les tables en local (pour le développement)
npm run db:init

# Et en production (Cloudflare)
npm run db:init:remote
```

---

## Étape 3 — Lancer en développement

Cloudflare a un outil appelé `wrangler pages dev` qui simule l'environnement de production en local :

```bash
# D'abord, build Next.js
npm run build

# Ensuite, lancer avec Wrangler (donne accès à Vectorize, D1, AI)
npm run pages:build
wrangler pages dev .vercel/output/static
```

> **Pourquoi pas juste `npm run dev` ?** La commande `next dev` ne donne pas accès aux bindings Cloudflare (Vectorize, D1, AI). Il faut utiliser `wrangler pages dev` pour ça.

Ouvre http://localhost:8788 dans ton navigateur.

---

## Étape 4 — Tester l'application

### Test rapide avec l'API (optionnel)

```bash
# Ajouter une offre
curl -X POST http://localhost:8788/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Développeur React Senior",
    "company": "Startup XYZ",
    "description": "Nous cherchons un dev React expérimenté pour notre produit SaaS B2B.",
    "skills": ["React", "TypeScript", "Node.js"]
  }'

# Ajouter un CV
curl -X POST http://localhost:8788/api/cvs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Yasmine Benali",
    "email": "yasmine@example.com",
    "summary": "Développeuse Frontend 5 ans d'\''expérience, spécialisée React et Vue.js.",
    "skills": ["React", "Vue.js", "TypeScript", "GraphQL"]
  }'

# Récupère l'ID du CV dans la réponse, puis lance le matching :
curl "http://localhost:8788/api/match?cvId=ID_DU_CV&explain=true"
```

---

## Étape 5 — Déployer en production

### Option A : Cloudflare Pages (gratuit, recommandé)

```bash
# Build le projet pour Cloudflare
npm run pages:build

# Déploie
npm run pages:deploy
```

Après le premier déploiement, **n'oublie pas d'initialiser la DB en remote** :
```bash
npm run db:init:remote
```

### Option B : Vercel

```bash
# Installe la CLI Vercel
npm install -g vercel

# Déploie
vercel
```

> ⚠️ Sur Vercel, les bindings Cloudflare (Vectorize, D1, AI) ne fonctionnent pas directement. Il faut utiliser l'API REST Cloudflare à la place. Recommande Cloudflare Pages pour ce projet.

---

## Structure des fichiers

```
talentmatch-next/
├── app/
│   ├── page.tsx              ← Interface React (tout l'UI)
│   ├── layout.tsx            ← Layout avec les fonts
│   ├── globals.css           ← Styles
│   └── api/
│       ├── jobs/route.ts     ← POST/GET /api/jobs
│       ├── cvs/route.ts      ← POST/GET /api/cvs
│       └── match/route.ts    ← GET /api/match?cvId=xxx
├── lib/
│   └── cloudflare.ts         ← Helpers : embeddings, LLM, bindings
├── schema.sql                ← Schéma de la base de données
├── wrangler.toml             ← Config Cloudflare (à modifier avec tes IDs)
└── package.json
```

---

## Endpoints API

| Méthode | URL | Description |
|---------|-----|-------------|
| `POST` | `/api/jobs` | Indexer une nouvelle offre |
| `GET` | `/api/jobs` | Lister toutes les offres |
| `POST` | `/api/cvs` | Indexer un CV (JSON ou PDF) |
| `GET` | `/api/cvs` | Lister tous les CVs |
| `GET` | `/api/match?cvId=xxx` | Trouver les meilleures offres pour un CV |
| `GET` | `/api/match?jobId=xxx` | Trouver les meilleurs CVs pour une offre |
| `GET` | `/api/match?cvId=xxx&explain=true` | Avec explication IA |

---

## Problèmes fréquents

**"Cloudflare bindings non disponibles"**
→ Tu utilises `npm run dev`. Lance `wrangler pages dev` à la place.

**"database_id is required"**
→ Tu as oublié de remplacer `REMPLACE_PAR_TON_ID` dans `wrangler.toml`.

**"vectorize index not found"**
→ Tu as oublié de créer les index (Étape 2a).

**"Failed to generate embedding"**
→ Le binding AI n'est pas configuré. Vérifie que `[ai]` est dans ton `wrangler.toml`.

---

## Aller plus loin

- **Import PDF natif** : Intégrer un parser PDF côté edge avec `@cf/mistral` pour extraire le texte automatiquement
- **Filtres avancés** : Filtrer par localisation ou type de contrat via les métadonnées Vectorize
- **Notifications** : Envoyer un email/Slack quand un candidat matche fortement une offre (Workers + Email Routing)
- **Auth** : Ajouter Cloudflare Access pour protéger l'app
- **Analytics** : Tracker quels matchings convertissent avec Cloudflare Analytics Engine
