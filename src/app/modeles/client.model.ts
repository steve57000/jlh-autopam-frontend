export interface ClientResponse {
  idClient: number;
  nom: string;
  prenom?: string;
  email: string;
  telephone?: string | null;
  immatriculation?: string | null;
  vehiculeMarque?: string | null;
  vehiculeModele?: string | null;
  adresseLigne1?: string | null;
  adresseLigne2?: string | null;
  codePostal?: string | null;
  ville?: string | null;
  emailVerified?: boolean;
  emailVerifiedAt?: string | null;
  createdAt?: string;
}

export type UpdateClientPayload = Partial<Omit<ClientResponse, 'idClient'>>;
