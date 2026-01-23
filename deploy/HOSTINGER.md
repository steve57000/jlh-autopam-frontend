# Déploiement Hostinger (front + back + reverse proxy)

Ce dossier propose une stack Docker unique (backend, frontend, PostgreSQL et reverse proxy) ainsi
qu'un `nginx.conf` prêt à servir deux sous-domaines :

- `api.example.com` → backend Spring Boot
- `app.example.com` → frontend Angular SSR

Exemple avec votre domaine `jlh-autopam.fr` :

- `api.jlh-autopam.fr` → backend Spring Boot
- `app.jlh-autopam.fr` (ou `www.jlh-autopam.fr`) → frontend Angular SSR

> ⚠️ Remplacez `api.example.com` et `app.example.com` par vos vrais domaines dans
> `deploy/nginx/conf.d/hostinger.conf`.

## 1) Fichier `.env`

Créez un fichier `.env` à la racine du repo avec les variables suivantes :

```bash
DB_NAME=jlh_autopam
DB_USERNAME=postgres
DB_PASSWORD=motdepassefort
```

## 2) Démarrage de la stack

```bash
docker compose -f docker-compose.hostinger.yml up -d
```

## 3) Ports exposés

- Nginx reverse proxy : **80** (public)
- Backend : **8080** (interne au réseau Docker)
- Frontend SSR : **4000** (interne au réseau Docker)
- PostgreSQL : **5432** (interne au réseau Docker)

## 4) Déploiement sur VPS Hostinger

1. Installez Docker + Compose sur le VPS.
2. Copiez ce repo (ou uniquement le dossier `deploy/` + `docker-compose.hostinger.yml`).
3. Ouvrez les ports 80/443 dans le firewall VPS.
4. Configurez vos DNS :
   - `api.example.com` → IP du VPS
   - `app.example.com` → IP du VPS

## 5) Créer les sous-domaines chez Hostinger

Dans Hostinger (DNS Zone) :

1. **Ajouter un enregistrement A** pour `api` qui pointe vers l'IP du VPS.
2. **Ajouter un enregistrement A** pour `app` (ou `www`) qui pointe vers la même IP.
3. Attendre la propagation DNS (quelques minutes à quelques heures).

Pour `jlh-autopam.fr`, cela donne :

- `api.jlh-autopam.fr` → A → IP du VPS
- `app.jlh-autopam.fr` → A → IP du VPS

## 6) HTTPS (recommandé)

Ajoutez un service de certificats (ex: Caddy, Traefik ou Certbot) pour TLS. Ce fichier Nginx
est compatible avec un proxy TLS en amont.

## 7) Déploiement si vous utilisez Docker Hub (registre privé)

Si Hostinger doit tirer vos images depuis Docker Hub :

1. **Se connecter au registre** sur le VPS :
   ```bash
   docker login
   ```
2. **Lancer la stack** (les images seront récupérées automatiquement) :
   ```bash
   docker compose -f docker-compose.hostinger.yml up -d
   ```

Vous pouvez remplacer les tags d'images dans `docker-compose.hostinger.yml` pour
pointer vers vos repos privés (ex: `registry.example.com/mon-backend:prod`).

## 8) CI/CD avec 2 repos séparés (front + back)

Si vous déployez depuis **deux repos distincts** :

1. **Repo backend** : build l'image → push sur Docker Hub (tag `:prod` ou SHA).
2. **Repo frontend** : build l'image SSR → push sur Docker Hub (tag `:prod` ou SHA).
3. **Sur le VPS** : utilisez un `docker-compose.hostinger.yml` qui référence
   ces images (même sans code source présent).
4. **Mise à jour** :
   ```bash
   docker compose -f docker-compose.hostinger.yml pull
   docker compose -f docker-compose.hostinger.yml up -d
   ```

Astuce : vous pouvez déclencher ces commandes via un pipeline SSH (GitHub Actions,
GitLab CI, etc.).
