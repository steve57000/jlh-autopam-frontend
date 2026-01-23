# ---------- BUILDER STAGE ----------
FROM node:18-alpine AS builder

# Créer et positionner le workspace
WORKDIR /app

# Copier juste package.json + lockfile pour installer deps sans tout recopier à chaque build
COPY package.json package-lock.json ./

# Installer les dépendances
RUN npm ci

# Copier le reste du code et builder l’app Angular (SSR)
COPY . .
RUN npm run build

# ---------- PRODUCTION STAGE ----------
FROM node:18-alpine AS runner

WORKDIR /app

# Définir NODE_ENV pour l'app SSR
ENV NODE_ENV=production
ENV PORT=4000

# Installer uniquement les dépendances de production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copier le build Angular SSR
COPY --from=builder /app/dist ./dist

# Exposer le port SSR
EXPOSE 4000

# Démarrer le serveur Angular SSR
CMD ["node", "dist/jlh-autopam-frontend/server/server.mjs"]
