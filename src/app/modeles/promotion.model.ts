export interface PromotionModel {
  idPromotion: number;
  administrateurId: number;
  imageUrl: string;
  validFrom: string;
  validTo: string;
  description: string;
  [key: string]: any;
}

/** Ce que le formulaire envoie au serveur */
export interface PromotionRequest {
  administrateurId: number;
  validFrom: string; // ISO
  validTo:   string; // ISO
  imageUrl?: string;
  description: string;
}

/** Ce que le serveur renvoie */
export interface PromotionResponse {
  idPromotion: number;
  administrateurId: number;
  imageUrl: string;
  validFrom: string;
  validTo: string;
  description: string;
  [key: string]: any;
}
