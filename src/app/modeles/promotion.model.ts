export interface PromotionModel {
  idPromotion: number;
  administrateurId: number; // ou administrateur?: any si tu récupères l'objet complet
  imageUrl: string;
  validFrom: string; // format ISO-8601
  validTo: string;   // format ISO-8601
  [key: string]: any; // Pour flexibilité
}
