export interface ServiceDto {
  idService?: number;
  libelle: string;
  description?: string | null;
  descriptionLongue?: string | null;
  iconId?: number | null;
  iconUrl?: string | null;
  prixUnitaire: number | string;
  quantiteMode?: 'UNIQUE' | 'LOT';
  prixMode?: 'UNITAIRE' | 'LOT';
  tailleLot?: number | null;
  quantiteMax?: number | null;
  archived?: boolean;
}
