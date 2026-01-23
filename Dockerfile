# ---------- BUILDER STAGE ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Installer les dépendances
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# Copier le reste du code et builder l'app Angular SSR
COPY . .
RUN pnpm run build

# ---------- PRODUCTION STAGE ----------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Installer uniquement les dépendances de prod
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod

# Copier le build SSR Angular
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["pnpm", "run", "start:ssr"]
