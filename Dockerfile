# ---------- BUILDER STAGE ----------
FROM node:18-alpine AS builder

# Créer et positionner le workspace
WORKDIR /app

# Copier juste package.json + lockfile pour installer deps sans tout recopier à chaque build
COPY package.json package-lock.json ./

# Installer les dépendances
RUN npm ci

# Copier le reste du code et builder l’app Next.js
COPY . .
RUN npm run build

# ---------- PRODUCTION STAGE ----------
FROM node:18-alpine AS runner

WORKDIR /app

# Définir NODE_ENV pour Next.js
ENV NODE_ENV=production

# Copier package.json, lockfile et node_modules depuis le builder
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copier le build Next.js et les fichiers statiques
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Exposer le port sur lequel Next.js tourne
EXPOSE 3000

# Démarrer Next.js en mode production
CMD ["npm", "start"]
