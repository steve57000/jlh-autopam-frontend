export interface DemandeServiceRequest {
  demandeId: number;
  serviceId: number;
  quantite: number;
}

export interface DemandeServiceKeyDto {
  demandeId: number;
  serviceId: number;
}

export interface DemandeServiceResponse {
  id: DemandeServiceKeyDto;
  quantite: number;
}
