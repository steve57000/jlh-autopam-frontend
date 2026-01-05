export interface ServiceDto {
  idService?: number;
  libelle: string;
  description?: string | null;
  icon?: string | null;
  prixUnitaire: number | string;
  quantiteMax?: number | null;
  archived?: boolean;
}
