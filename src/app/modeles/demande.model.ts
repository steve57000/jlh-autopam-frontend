export interface ServiceItem {
  id_service: number;
  libelle: string;      // libellé du service (ex: "Vidange")
  quantite: number;
  prix_unitaire?: number;
}

export interface DemandeDto {
  id_demande: number;
  code_type: 'Devis' | 'Service' | 'RendezVous';
  code_statut: 'En_attente' | 'Traitee' | 'Annulee';
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
  };
}

export interface DemandeWithServices extends DemandeDto {
  services: ServiceItem[];
}
