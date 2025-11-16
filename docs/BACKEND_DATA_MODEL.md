# Guide d'intégration Frontend – modèle de données & API

Ce document résume le modèle métier exposé par le backend Spring Boot et décrit comment le frontend (client comme administrateur) doit consommer les entités et endpoints critiques : clients, demandes, services et rendez-vous.

## 1. Vue d'ensemble du domaine

| Entité | Rôle | Relations principales |
| --- | --- | --- |
| `Client` | Utilisateur final authentifié (compte vérifié par e-mail) | possède 0..n `Demande`, 0..n `RendezVous` (via `Demande`) |
| `Demande` | Point d'entrée d'un besoin (devis ou rendez-vous) | appartient à un `Client`, référence un `TypeDemande`, un `StatutDemande`, plusieurs `DemandeService`, 0..n `DemandeDocument`, 0..n entrées de `DemandeTimeline`, 0..1 `Devis`, 0..1 `RendezVous` |
| `Service` | Prestations proposées (vidange, révision...) | lié à 0..n `DemandeService` |
| `DemandeService` | Ligne de devis associée à une demande | relie une `Demande` et un `Service`, contient les libellés/prix figés |
| `RendezVous` | Planification concrète validée sur un créneau | associe `Demande`, `Creneau`, `Administrateur`, `StatutRendezVous` |
| `Creneau` | Intervalle horaire | possède un `StatutCreneau`, peut être relié à un `RendezVous` et des `Disponibilite` |
| `Administrateur` | Staff du garage | planifie des `Disponibilite`, gère `Demande` et `RendezVous` |
| `Promotion`, `DemandeDocument`, `DemandeTimeline`, `Devis` | Artefacts secondaires | alimentent l'affichage client/admin |

Le schéma relationnel complet est défini dans `schema_jlh_autopam.sql` et pré-alimenté par `data.sql` (codes des statuts, types, jeux de données de test).

## 2. Dictionnaires et valeurs contrôlées

- **Types de demande** (`TypeDemande`) : `Devis`, `Service`, `RendezVous`. Ces codes pilotent les écrans affichés côté client.
- **Statuts de demande** (`StatutDemande`) : `Brouillon`, `En_attente`, `Traitee`, `Annulee`. Une demande en brouillon n'est visible que du client propriétaire. Le passage en `En_attente` se fait automatiquement lorsqu'un RDV est créé ou soumis.
- **Statuts de créneau** (`StatutCreneau`) : `Libre`, `Reserve`, `Indisponible`. `Reserve` est utilisé dès qu'un rendez-vous est créé sur le créneau.
- **Statuts de rendez-vous** (`StatutRendezVous`) : `Confirme`, `Reporte`, `Annule`. Le code est stocké dans `RendezVous` et reflété dans les DTO.

Ces tables de référence sont consultables/modifiables via les endpoints `/api/type-demandes`, `/api/statut-demandes`, `/api/statut-creneaux` et `/api/statut-rendezvous` (contrôleurs dédiés).

## 3. DTO principaux échangés avec le frontend

### 3.1 Clients (`ClientResponse`)

```json
{
  "idClient": 1,
  "nom": "Durand",
  "prenom": "Alice",
  "email": "test@client1.fr",
  "immatriculation": "AA-123-AA",
  "vehiculeMarque": "Peugeot",
  "vehiculeModele": "208",
  "telephone": "0601020304",
  "adresseLigne1": "12 rue Victor Hugo",
  "adresseLigne2": null,
  "codePostal": "75003",
  "ville": "Paris",
  "emailVerified": true,
  "emailVerifiedAt": "2025-06-01T10:00:00Z"
}
```

### 3.2 Demandes

`DemandeRequest` sert aux créations/mises à jour : date, `clientId` (admin uniquement), `codeType`, `codeStatut`, informations véhicule/contact et la collection `services` (chaque entrée reprend `idService`, `quantite`, libellés et prix déjà figés).

`DemandeResponse` renvoie :
- métadonnées (id, `dateDemande`),
- un `client` réduit (`ClientSummaryDto`),
- le `typeDemande` (`codeType`, `libelle`),
- le `statutDemande` (`codeStatut`, `libelle`),
- la liste `services` (somme côté frontend),
- `documents` (nom, URL publique, poids, visibilité client),
- `timeline` (voir §3.4).

### 3.3 Rendez-vous

`RendezVousRequest` contient `demandeId`, `creneauId`, `administrateurId`, `codeStatut`. `RendezVousResponse` renvoie `idRdv`, `demandeId`, `creneauId`, `administrateurId` et un objet `statut` (`codeStatut`, `libelle`).

### 3.4 Timeline d'une demande

Chaque entrée (`DemandeTimelineEntryDto`) expose :
- `type` (`STATUT`, `DOCUMENT`, `MONTANT`, `RENDEZVOUS`...),
- auteur (`createdBy`, `createdByRole`),
- `visibleClient` (filtrage côté frontend pour les clients),
- bloc optionnel `statut` (changement de statut), `commentaire`, `montantValide`, `document` (nom, URL, mime), `rendezVous` (id + dates). Le champ `source` permet d'indiquer l'origine métier.

### 3.5 Statistiques & RDV

- `/api/demandes/mes-demandes/stats` retourne `ClientStatsDto` : compte des demandes `enAttente`, `traitees`, `annulees` et `rdvAvenir`.
- `/api/demandes/mes-demandes/prochain-rdv` renvoie `ProchainRdvDto` (id du RDV, statut, `dateDebut`, `dateFin`).

## 4. Flux côté client (ROLE_CLIENT)

1. **Création / récupération de demande courante**
   - `POST /api/demandes/current` : retourne la demande brouillon existante ou en crée une nouvelle (`codeType=Devis`, `codeStatut=Brouillon`).
   - `POST /api/demandes` : crée explicitement une demande (bloqué si un brouillon existe déjà, l'API renvoie 409 avec l'id existant).

2. **Consultation**
   - `GET /api/demandes/mes-demandes` : liste paginée côté frontend (le backend renvoie toutes les demandes du client). Filtrer la timeline via `visibleClient=true` (le contrôleur le fait déjà).
   - `GET /api/demandes/mes-demandes/stats` & `/prochain-rdv` pour alimenter tableaux de bord.

3. **Mise à jour**
   - `PATCH /api/demandes/{id}/type` : change `codeType` (payload `{ "codeType": "RendezVous" }`).
   - `PATCH /api/demandes/{id}/submit` : passe la demande du client de `Brouillon` à `En_attente`.
   - `PATCH /api/rendezvous/{id}/submit` : même transition mais à partir d'un RDV créé (vérifie l'appartenance du client).

4. **Rendez-vous**
   - Lecture : `GET /api/rendezvous/{id}` (restreint au propriétaire) et `GET /api/demandes/mes-demandes/prochain-rdv.ics` / `/api/demandes/rendezvous/{id}/ics` pour exporter un fichier calendrier.
   - Création/mise à jour : le client peut proposer un RDV via `POST/PUT /api/rendezvous` en fournissant `demandeId` (doit lui appartenir), `creneauId` et `codeStatut` initial.

5. **Documents & timeline**
   - `GET /api/demandes/{id}` renvoie déjà `documents` + `timeline`. Pour ajouter un document, le frontend client doit passer par le workflow géré par `DemandeDocumentController` (upload multipart).

## 5. Flux côté administrateur (ROLE_ADMIN)

1. **Clients** : CRUD complet via `/api/clients`. Chaque création renvoie `ClientResponse` (mêmes champs qu'au §3.1) pour affichage immédiat.
2. **Demandes** :
   - Listing global `/api/demandes` (version détaillée) ou `/api/admin/demandes` (DTO simplifié `DemandeDto`).
   - Création/mise à jour via `POST/PUT /api/demandes` avec `clientId`, `codeType`, `codeStatut` explicites.
   - Suppression `DELETE /api/demandes/{id}`.
   - Ajout d'événements timeline via `POST /api/demandes/{id}/timeline` (payload `DemandeTimelineRequest`).
3. **Rendez-vous** :
   - `GET /api/rendezvous` : liste complète (tous RDV).
   - `POST /api/rendezvous` : crée le RDV, change le type de la demande en `RendezVous` si nécessaire, positionne `codeStatut` et pousse deux événements timeline (planification + éventuel changement de statut).
   - `PUT /api/rendezvous/{id}` : modifie créneau/statut/admin.
   - `DELETE /api/rendezvous/{id}` : supprime le RDV (libère le créneau côté service).
4. **Disponibilités et créneaux** : `/api/creneaux`, `/api/disponibilites` permettent de remplir les sélecteurs (les contrôleurs renvoient respectivement `CreneauResponse` et `DisponibiliteResponse`).
5. **Lookups** : `/api/services`, `/api/type-demandes`, `/api/statut-demandes`, `/api/statut-rendezvous`, `/api/statut-creneaux` doivent être chargés au démarrage de l'UI pour alimenter les menus déroulants.

## 6. Schéma de persistance simplifié

```
Client 1---n Demande 1---n DemandeService ---1 Service
              |         \ \
              |          \ \-- n DemandeDocument
              |           \---- n DemandeTimeline
              |            \---0..1 Devis
              |             \--0..1 RendezVous ---1 Creneau ---1 StatutCreneau
              |                                  \---1 Administrateur ---n Disponibilite ---1 Creneau
              |                                   \--1 StatutRendezVous
              \---1 StatutDemande
              \---1 TypeDemande
```

Les correspondances exactes des colonnes sont disponibles dans `schema_jlh_autopam.sql`. Pensez à synchroniser vos formulaires avec les champs `DemandeRequest` et `RendezVousRequest` pour garantir la validation backend.

## 7. Bonnes pratiques côté frontend

1. **Toujours relire la ressource** après une création/mise à jour (les services retournent l'objet complet avec statut/timeline actualisés).
2. **Filtrer la timeline client** sur `visibleClient=true` même si le contrôleur applique déjà ce filtre, afin d'éviter d'afficher une note interne reçue par WebSocket ou cache.
3. **Verrouillage fonctionnel** : empêchez la création de plusieurs brouillons simultanés en réutilisant l'ID retourné par l'erreur 409 lors de `POST /api/demandes`.
4. **Synchronisation des lookups** : mettez en cache `typeDemande`, `statutDemande`, `statutRendezVous`, `statutCreneau` et `services` pour éviter des hard-codes.
5. **ICS** : lorsque l'utilisateur télécharge un RDV, utilisez l'URL fournie par `GET /api/demandes/rendezvous/{id}/ics` pour générer un fichier `.ics` côté navigateur.
6. **Séparation client/admin** : basez les écrans sur le rôle (`ROLE_CLIENT` vs `ROLE_ADMIN`) exposé par le token JWT. Certains endpoints (submit RDV/demande) exigent d'être propriétaire : attendez-vous à un 403 si l'ID ne correspond pas.
