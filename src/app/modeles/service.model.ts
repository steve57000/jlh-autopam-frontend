export interface ServiceDto {
  idService?: number;
  libelle: string;
  description?: string | null;
  descriptionLongue?: string | null;
  iconId?: number | null;
  iconUrl?: string | null;
  prixUnitaire: number | string;
  quantiteMax?: number | null;
  archived?: boolean;
}
