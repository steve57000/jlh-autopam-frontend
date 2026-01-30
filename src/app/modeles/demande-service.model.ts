export interface DemandeServiceRequest {
  demandeId: number;
  serviceId: number;
  quantite: number;
  prixUnitaire?: number | null;
  rendezVousId?: number | null;
}

export interface DemandeServiceKeyDto {
  demandeId: number;
  serviceId: number;
}

export interface DemandeServiceResponse {
  id: DemandeServiceKeyDto;
  quantite: number;
  prixUnitaire?: number | null;
  rendezVousId?: number | null;
  quantiteMode?: 'UNIQUE' | 'LOT';
  prixMode?: 'UNITAIRE' | 'LOT';
  tailleLot?: number | null;
}
