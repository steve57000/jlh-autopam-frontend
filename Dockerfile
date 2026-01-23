# ---------- BUILDER STAGE ----------
FROM node:18-alpine AS builder

WORKDIR /app

# Installer les dépendances
COPY package.json package-lock.json ./
RUN npm ci

# Copier le reste du code et builder l'app Angular SSR
COPY . .
RUN npm run build

# ---------- PRODUCTION STAGE ----------
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Installer uniquement les dépendances de prod
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copier le build SSR Angular
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/jlh-autopam-frontend/server/server.mjs"]
