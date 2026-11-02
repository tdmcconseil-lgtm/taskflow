# syntax=docker/dockerfile:1

# --- Étape de build ---
FROM node:22-bookworm-slim AS build
WORKDIR /app
# openssl est requis par Prisma.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Valeurs factices passées en ligne : prisma.config.ts exige DATABASE_URL, et le
# build Next est entièrement dynamique (aucune connexion réelle à la base). Elles
# ne sont pas conservées dans l'image (fournies uniquement à ces commandes).
RUN DATABASE_URL="postgresql://u:p@localhost:5432/db?schema=public" npx prisma generate
RUN DATABASE_URL="postgresql://u:p@localhost:5432/db?schema=public" \
    AUTH_SECRET="build-placeholder" \
    npm run build

# --- Étape d'exécution ---
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Hash du commit déployé (passé par le script de déploiement). Lu au runtime par
# l'appli (pied de page + route /version) pour vérifier d'un coup d'œil quelle
# version tourne. Placé dans l'étape runtime : changer de commit ne reconstruit
# que cette petite couche, pas tout le build.
ARG GIT_SHA=unknown
ENV BUILD_SHA=$GIT_SHA
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app ./
EXPOSE 3001
# Applique les migrations puis démarre le serveur Next.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
