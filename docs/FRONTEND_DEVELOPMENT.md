# Frontend – infos utiles pour le développement

## 1) URLs et configuration générale
- **Base API par défaut** : `app.baseUrl` est configuré sur `http://localhost:8080` en local, et le front attendu sur `http://localhost:4200` (`app.frontendUrl`).【F:src/main/resources/application.yml†L7-L13】
- **Profils et assets** :
  - **Dev** : `app.images.base-url` pointe vers `http://localhost:80/promotions/images/` (Nginx) et `app.files.base-url` vers `http://localhost:80` (utile pour les fichiers/icos).【F:src/main/resources/application-dev.properties†L16-L19】
  - **Prod** : les mêmes bases sont paramétrées en HTTPS (`https://api.jlh-auto.fr/...`).【F:src/main/resources/application-prod.properties†L14-L16】

## 2) Démarrage local (backend + assets)
- **Backend** : le compose dev expose le backend sur `localhost:8080` et démarre PostgreSQL 16 + MailHog (SMTP).【F:docker-compose.dev.yml†L1-L64】
- **Nginx** : expose les assets statiques (images de promotions, icônes) sur `localhost:80` via `/promotions/images/` et `/icons/` et reverse-proxy les autres requêtes vers le backend.【F:docker-compose.dev.yml†L65-L76】【F:nginx/conf.d/promotions.conf†L1-L22】

## 3) Authentification & sécurité (JWT)
- **JWT Bearer** : les requêtes authentifiées doivent inclure l’en-tête `Authorization: Bearer <token>` ; le filtre JWT lit et valide le token avant d’hydrater le `SecurityContext`.【F:src/main/java/com/jlh/jlhautopambackend/config/JwtAuthenticationFilter.java†L34-L66】
- **Login** : `POST /api/auth/login` renvoie `{ "token": "..." }` en cas de succès et gère les erreurs 401/403 (compte non vérifié).【F:src/main/java/com/jlh/jlhautopambackend/controllers/AuthController.java†L45-L69】
- **Inscription** : `POST /api/auth/register` crée un client et déclenche l’envoi d’un e-mail de vérification.【F:src/main/java/com/jlh/jlhautopambackend/controllers/AuthController.java†L72-L112】
- **Vérification e-mail** : le lien de vérification pointe vers `app.baseUrl/api/auth/verify-email?token=...` et, une fois validé, redirige vers le front `http://localhost:4200/login?verified=1`.【F:src/main/java/com/jlh/jlhautopambackend/services/EmailVerificationService.java†L33-L67】【F:src/main/java/com/jlh/jlhautopambackend/controllers/AuthController.java†L123-L131】
- **Réinitialisation MDP** : `POST /api/auth/forgot-password` puis `POST /api/auth/reset-password` gèrent le flux de reset.【F:src/main/java/com/jlh/jlhautopambackend/controllers/AuthController.java†L133-L152】

## 4) CORS et erreurs d’accès
- **CORS** : autorise `http://localhost:4200` (et `http://localhost:63342`) avec `Authorization`/`Content-Type` etc., méthodes `GET/POST/PUT/DELETE/PATCH/OPTIONS` et credentials activés.【F:src/main/java/com/jlh/jlhautopambackend/config/SecurityConfig.java†L124-L149】
- **Erreurs 401/403** : réponses JSON standardisées `{ "message": "Unauthorized" }` ou `{ "message": "Forbidden" }`.【F:src/main/java/com/jlh/jlhautopambackend/config/SecurityConfig.java†L106-L120】

## 5) Rôles et accès (résumé)
- **Publics (sans token)** : `GET /api/promotions/**`, `GET /api/services/**`, `GET /api/service-icons/**`, routes `/api/auth/**` et `/uploads/**`.【F:src/main/java/com/jlh/jlhautopambackend/config/SecurityConfig.java†L52-L65】
- **Client** : création de demandes, accès aux “mes demandes”/stats/ICS, et actions RDV (selon rôle).【F:src/main/java/com/jlh/jlhautopambackend/config/SecurityConfig.java†L67-L83】
- **Admin/Manager** : gestion clients, promotions, services, service-icons (création/modif/suppression) et demandes-services selon les méthodes autorisées.【F:src/main/java/com/jlh/jlhautopambackend/config/SecurityConfig.java†L86-L104】

## 6) Endpoints utiles pour le front
> Liste rapide des principaux modules (voir `src/main/java/.../controllers`).

### Auth & profil
- **Auth** : `/api/auth/login`, `/api/auth/register`, `/api/auth/verify-email`, `/api/auth/resend-verification`, `/api/auth/forgot-password`, `/api/auth/reset-password`.【F:src/main/java/com/jlh/jlhautopambackend/controllers/AuthController.java†L41-L152】
- **Profil client** : `/api/me` (GET/PUT) et `/api/me/change-password` (POST).【F:src/main/java/com/jlh/jlhautopambackend/controllers/MeController.java†L19-L99】

### Catalogue & contenus publics
- **Promotions** : `/api/promotions` (GET public, POST/PUT/DELETE admin). Les créations/modifs utilisent du `multipart/form-data` avec `data` (JSON) + `file` (image).【F:src/main/java/com/jlh/jlhautopambackend/controllers/PromotionController.java†L17-L68】
- **Services** : `/api/services` (GET public, CRUD admin).【F:src/main/java/com/jlh/jlhautopambackend/controllers/ServiceController.java†L19-L83】
- **Icônes de service** : `/api/service-icons` (GET public, POST/PUT/DELETE admin). Supporte JSON **ou** multipart (`file` + `label`).【F:src/main/java/com/jlh/jlhautopambackend/controllers/ServiceIconController.java†L21-L84】

### Demandes, RDV, devis
- **Demandes** : `/api/demandes` + routes client (`/api/demandes/mes-demandes`, stats, ICS) et admin (`/api/admin/demandes`).【F:src/main/java/com/jlh/jlhautopambackend/controllers/DemandeController.java†L23-L188】【F:src/main/java/com/jlh/jlhautopambackend/controllers/DemandeAdminController.java†L17-L74】
- **Rendez-vous** : `/api/rendezvous` (création + listing selon rôle).【F:src/main/java/com/jlh/jlhautopambackend/controllers/RendezVousController.java†L18-L110】
- **Devis** : `/api/devis` (CRUD + création RDV depuis un devis).【F:src/main/java/com/jlh/jlhautopambackend/controllers/DevisController.java†L22-L104】
- **Timeline** : `/api/demandes/{demandeId}/timeline`.【F:src/main/java/com/jlh/jlhautopambackend/controllers/DemandeTimelineController.java†L19-L84】
- **Documents** : `/api/demandes/{demandeId}/documents` (upload/admin) + routes client (`/client`).【F:src/main/java/com/jlh/jlhautopambackend/controllers/DemandeDocumentController.java†L27-L166】

### Référentiels
- **Types/Statuts** : `/api/type-demandes`, `/api/statut-demandes`, `/api/statut-rendezvous`, `/api/statuts-creneau`.【F:src/main/java/com/jlh/jlhautopambackend/controllers/TypeDemandeController.java†L13-L59】【F:src/main/java/com/jlh/jlhautopambackend/controllers/StatutDemandeController.java†L13-L54】【F:src/main/java/com/jlh/jlhautopambackend/controllers/StatutRendezVousController.java†L13-L56】【F:src/main/java/com/jlh/jlhautopambackend/controllers/StatutCreneauController.java†L14-L60】
- **Créneaux & disponibilités** : `/api/creneaux`, `/api/disponibilites`.【F:src/main/java/com/jlh/jlhautopambackend/controllers/CreneauController.java†L14-L57】【F:src/main/java/com/jlh/jlhautopambackend/controllers/DisponibiliteController.java†L14-L55】

## 7) Uploads & URLs publiques
- **Promotions (images)** : le backend renvoie une `imageUrl` construite à partir de `app.images.base-url` si un chemin relatif est stocké, ce qui permet au front de consommer directement l’URL finale (Nginx ou CDN).【F:src/main/java/com/jlh/jlhautopambackend/mapper/PromotionMapper.java†L18-L74】
- **Icônes de service** : les URLs sont construites à partir de `app.files.base-url`, puis stockées dans le champ `url` des icônes (retourné au front).【F:src/main/java/com/jlh/jlhautopambackend/services/ServiceIconServiceImpl.java†L21-L83】【F:src/main/java/com/jlh/jlhautopambackend/services/ServiceIconServiceImpl.java†L182-L206】
- **Fichiers exposés par le backend** : `GET /uploads/{path}` sert les fichiers stockés via le backend (utile si besoin d’un proxy côté API).【F:src/main/java/com/jlh/jlhautopambackend/controllers/UploadsController.java†L17-L41】

## 8) Conseils rapides d’intégration front
- **Base API locale** : utiliser `http://localhost:8080` pour l’API et `http://localhost:80` pour les assets servis par Nginx (promotions, icônes).【F:src/main/resources/application.yml†L7-L13】【F:docker-compose.dev.yml†L52-L76】【F:nginx/conf.d/promotions.conf†L1-L22】
- **JWT** : stocker le token renvoyé par `/api/auth/login` et l’envoyer sur toutes les routes protégées via `Authorization: Bearer …`.【F:src/main/java/com/jlh/jlhautopambackend/controllers/AuthController.java†L45-L69】【F:src/main/java/com/jlh/jlhautopambackend/config/JwtAuthenticationFilter.java†L34-L66】

## 9) Voir aussi
- **Docker & environnement** : `DOCKER.md` récapitule le compose dev/prod, les variables attendues et les ports exposés.【F:docs/DOCKER.md†L1-L121】
- **Modèle de données** : `BACKEND_DATA_MODEL.md` détaille les entités, DTO et workflows fonctionnels clés.【F:docs/BACKEND_DATA_MODEL.md†L1-L117】
