# Taskflow

Outil de gestion de projets et de tâches en équipe (inspiré d'Asana).

## Stack

- **Next.js 16** (App Router, Server Actions, `proxy.ts`)
- **React 19**
- **Prisma 7** + `@prisma/adapter-pg` sur **PostgreSQL**
- Authentification maison : `jose` (session JWT en cookie) + `@node-rs/argon2` (hash des mots de passe)
- **Zod** (validation) · **Tailwind CSS 4**

## Modèle de données

```
User ─< Membership >─ Workspace ─< Project ─< Task
```

- `Membership` : rôle `OWNER` / `MEMBER` dans un espace de travail
- `Task` : statut (`TODO` / `IN_PROGRESS` / `DONE`), priorité (`LOW` / `MEDIUM` / `HIGH`), échéance, assigné (membre de l'espace)

## Démarrage

```bash
# 1. Variables d'environnement
cp .env.example .env   # adapter AUTH_SECRET si besoin

# 2. Base de données (PostgreSQL via Docker, port hôte 5433)
docker compose up -d

# 3. Créer les tables
npm run db:migrate

# 4. Lancer l'application (http://localhost:3001)
npm run dev
```

## Scripts

| Script | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement (port 3001) |
| `npm run build` / `npm start` | Build de production |
| `npm run db:migrate` | Créer / appliquer les migrations Prisma |
| `npm run db:studio` | Explorer la base (Prisma Studio) |
| `npm run db:generate` | Régénérer le client Prisma |

## Périmètre actuel (MVP)

Inscription / connexion · espaces de travail multi-membres · projets · tâches
avec assignation, échéance, priorité et statut · tableau de bord « Mes tâches ».

Chaque projet s'affiche en **vue Liste** ou en **vue Tableau (Kanban)** : colonnes
par statut, glisser-déposer d'une carte pour changer son statut.
