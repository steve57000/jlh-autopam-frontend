export type VehicleEnergyValue =
  | 'DIESEL'
  | 'ESSENCE'
  | 'GPL'
  | 'GNV'
  | 'ETHANOL'
  | 'HYBRIDE'
  | 'HYBRIDE_RECHARGEABLE'
  | 'ELECTRIQUE'
  | 'HYDROGENE'
  | 'AUTRE';

export const VEHICLE_ENERGY_OPTIONS: { value: VehicleEnergyValue; label: string }[] = [
  { value: 'ESSENCE', label: 'Essence' },
  { value: 'DIESEL', label: 'Diesel' },
  { value: 'GPL', label: 'GPL' },
  { value: 'GNV', label: 'GNV (gaz naturel)' },
  { value: 'ETHANOL', label: 'Éthanol (E85)' },
  { value: 'HYBRIDE', label: 'Hybride' },
  { value: 'HYBRIDE_RECHARGEABLE', label: 'Hybride rechargeable' },
  { value: 'ELECTRIQUE', label: 'Électrique' },
  { value: 'HYDROGENE', label: 'Hydrogène' },
  { value: 'AUTRE', label: 'Autre' }
];
