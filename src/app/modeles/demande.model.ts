export type DemandeTypeCode = 'Devis' | 'Service' | 'RendezVous';

export interface ServiceItem {
  id_service: number;
  libelle: string;      // libellé du service (ex: "Vidange")
  quantite: number;
  prix_unitaire?: number;
  quantite_max?: number;
}

export interface DemandeDto {
  id_demande: number;
  code_type: DemandeTypeCode;
  code_statut: 'Brouillon' | 'En_attente' | 'Traitee' | 'Annulee';
  // Libellés d'affichage (provenant de l'API : typeDemande.libelle, statutDemande.libelle)
  type_libelle?: string;
  statut_libelle?: string;

  date_demande: string; // ISO string
  client?: {
    id_client: number;
    nom: string;
    prenom?: string;
    email: string;
    telephone?: string | null;
    immatriculation?: string | null;
    adresseLigne1?: string | null;
    adresseLigne2?: string | null;
    adresseCodePostal?: string | null;
    adresseVille?: string | null;
    vehiculeMarque?: string | null;
    vehiculeModele?: string | null;
    vehiculeEnergie?: string | null;
  };
}

export interface DemandeWithServices extends DemandeDto {
  services: ServiceItem[];
  documents?: DemandeDocumentDto[];
  timeline?: DemandeTimelineEntryDto[];
  rendezVous?: RendezVousSummary | null;
}

export interface ClientSummaryDto {
  idClient: number;
  nom: string;
  prenom?: string;
  email: string;
  telephone?: string | null;
  immatriculation?: string | null;
  vehiculeMarque?: string | null;
  vehiculeModele?: string | null;
  vehiculeEnergie?: string | null;
  adresseLigne1?: string | null;
  adresseLigne2?: string | null;
  codePostal?: string | null;
  ville?: string | null;
}

export interface DemandeServiceDto {
  idService: number;
  libelle: string;
  prixUnitaire: number;
  quantite: number;
}

export interface DemandeDocumentDto {
  /** Identifiant du document (clé technique) */
  idDocument?: number;

  /** Nom du fichier (ex: devis_1234.pdf) – correspond à nomFichier côté backend */
  nomFichier: string;

  /** URL publique de téléchargement/visualisation – correspond à urlPrivate côté backend */
  urlPrivate: string | null;

  /** Type de contenu MIME (ex: application/pdf) – correspond à typeContenu côté backend */
  typeContenu?: string | null;

  /** Taille en octets – correspond à tailleOctets côté backend */
  tailleOctets?: number | null;

  /** Visibilité côté client */
  visibleClient?: boolean;

  /** Métadonnées auteur (admin/client) */
  creePar?: string | null;
  creeParRole?: string | null;

  /** Date de création (Instant ISO) – correspond à creeLe côté backend */
  creeLe?: string | null;

}

export interface RendezVousSummary {
  idRdv: number;
  codeStatut: string;
  libelleStatut?: string;
  dateDebut: string;
  dateFin: string;
  commentaire?: string | null;
  creneau?: {
    idCreneau: number;
    dateDebut: string;
    dateFin: string;
    statut?: { codeStatut: string; libelle?: string };
  };
}

export interface DemandeTimelineEntryDto {
  id?: number;
  type: string;
  source?: string;
  createdAt?: string;
  createdBy?: string;
  createdByRole?: string;
  visibleClient?: boolean;
  commentaire?: string;
  montantValide?: number;
  statut?: { codeStatut: string; libelle?: string };
  document?: DemandeDocumentDto;
  rendezVous?: RendezVousSummary | null;
}

export interface DemandeResponse {
  idDemande: number;
  dateDemande?: string;
  dateSoumission?: string;
  typeDemande?: { codeType: DemandeTypeCode | string; libelle?: string };
  statutDemande?: { codeStatut: string; libelle?: string };
  services?: DemandeServiceDto[];
  client?: ClientSummaryDto;
  documents?: DemandeDocumentDto[];
  timeline?: DemandeTimelineEntryDto[];
  rendezVous?: RendezVousSummary | null;
}
