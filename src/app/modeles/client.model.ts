export interface ClientResponse {
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
  emailVerified?: boolean;
  emailVerifiedAt?: string | null;
  createdAt?: string;
}

export type UpdateClientPayload = Partial<Omit<ClientResponse, 'idClient'>>;

export interface CreateClientPayload {
  nom: string;
  prenom: string;
  email: string;
  motDePasse: string;
  telephone: string;
  immatriculation: string;
  vehiculeMarque: string;
  vehiculeModele: string;
  vehiculeEnergie?: string | null;
  adresseLigne1: string;
  adresseLigne2?: string | null;
  codePostal: string;
  ville: string;
}
