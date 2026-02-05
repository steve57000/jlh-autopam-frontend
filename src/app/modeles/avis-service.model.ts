export interface AvisServiceClientDto {
  idClient: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  adresseLigne1?: string | null;
  adresseCodePostal?: string | null;
  adresseVille?: string | null;
}

export interface AvisServiceDto {
  idAvis: number;
  demandeId: number;
  serviceId: number;
  serviceLibelle?: string | null;
  clientId: number;
  clientNomPrenom?: string | null;
  note: number;
  statut?: string | null;
  commentaire?: string | null;
  creeLe: string;
  client?: AvisServiceClientDto | null;
}

export interface AvisServiceStatsDto {
  serviceId: number;
  moyenneNote: number;
  totalAvis: number;
}

export interface AvisServiceCreatePayload {
  demandeId: number;
  note: number;
  commentaire?: string | null;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface SpringPagedModel<T> {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
  page?: {
    size?: number;
    number?: number;
    totalElements?: number;
    totalPages?: number;
  };
}
