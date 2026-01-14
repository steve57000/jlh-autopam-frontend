export const VEHICLE_BRAND_OPTIONS = [
  { value: 'ABARTH', label: 'Abarth' },
  { value: 'ALFA_ROMEO', label: 'Alfa Romeo' },
  { value: 'AUDI', label: 'Audi' },
  { value: 'BMW', label: 'BMW' },
  { value: 'CITROEN', label: 'Citroën' },
  { value: 'CUPRA', label: 'Cupra' },
  { value: 'DACIA', label: 'Dacia' },
  { value: 'DS', label: 'DS Automobiles' },
  { value: 'FIAT', label: 'Fiat' },
  { value: 'FORD', label: 'Ford' },
  { value: 'HONDA', label: 'Honda' },
  { value: 'HYUNDAI', label: 'Hyundai' },
  { value: 'JAGUAR', label: 'Jaguar' },
  { value: 'JEEP', label: 'Jeep' },
  { value: 'KIA', label: 'Kia' },
  { value: 'LAND_ROVER', label: 'Land Rover' },
  { value: 'LEXUS', label: 'Lexus' },
  { value: 'MAZDA', label: 'Mazda' },
  { value: 'MERCEDES', label: 'Mercedes-Benz' },
  { value: 'MINI', label: 'Mini' },
  { value: 'MITSUBISHI', label: 'Mitsubishi' },
  { value: 'NISSAN', label: 'Nissan' },
  { value: 'OPEL', label: 'Opel' },
  { value: 'PEUGEOT', label: 'Peugeot' },
  { value: 'PORSCHE', label: 'Porsche' },
  { value: 'RENAULT', label: 'Renault' },
  { value: 'SEAT', label: 'Seat' },
  { value: 'SKODA', label: 'Škoda' },
  { value: 'SUBARU', label: 'Subaru' },
  { value: 'SUZUKI', label: 'Suzuki' },
  { value: 'TESLA', label: 'Tesla' },
  { value: 'TOYOTA', label: 'Toyota' },
  { value: 'VOLKSWAGEN', label: 'Volkswagen' },
  { value: 'VOLVO', label: 'Volvo' },
  { value: 'AUTRE', label: 'Autre' }
] as const;

export type VehicleBrandValue = (typeof VEHICLE_BRAND_OPTIONS)[number]['value'];

export const VEHICLE_MODEL_OPTIONS = {
  ABARTH: [
    { value: '500', label: '500' },
    { value: '595', label: '595' },
    { value: '695', label: '695' }
  ],
  ALFA_ROMEO: [
    { value: 'GIULIA', label: 'Giulia' },
    { value: 'GIULIETTA', label: 'Giulietta' },
    { value: 'STELVIO', label: 'Stelvio' },
    { value: 'TONALE', label: 'Tonale' }
  ],
  AUDI: [
    { value: 'A1', label: 'A1' },
    { value: 'A3', label: 'A3' },
    { value: 'A4', label: 'A4' },
    { value: 'A5', label: 'A5' },
    { value: 'A6', label: 'A6' },
    { value: 'A7', label: 'A7' },
    { value: 'A8', label: 'A8' },
    { value: 'Q2', label: 'Q2' },
    { value: 'Q3', label: 'Q3' },
    { value: 'Q5', label: 'Q5' },
    { value: 'Q7', label: 'Q7' },
    { value: 'Q8', label: 'Q8' },
    { value: 'TT', label: 'TT' }
  ],
  BMW: [
    { value: 'SERIE_1', label: 'Série 1' },
    { value: 'SERIE_2', label: 'Série 2' },
    { value: 'SERIE_3', label: 'Série 3' },
    { value: 'SERIE_4', label: 'Série 4' },
    { value: 'SERIE_5', label: 'Série 5' },
    { value: 'SERIE_7', label: 'Série 7' },
    { value: 'X1', label: 'X1' },
    { value: 'X2', label: 'X2' },
    { value: 'X3', label: 'X3' },
    { value: 'X4', label: 'X4' },
    { value: 'X5', label: 'X5' },
    { value: 'X6', label: 'X6' },
    { value: 'X7', label: 'X7' },
    { value: 'Z4', label: 'Z4' },
    { value: 'IX', label: 'iX' },
    { value: 'I4', label: 'i4' }
  ],
  CITROEN: [
    { value: 'C1', label: 'C1' },
    { value: 'C3', label: 'C3' },
    { value: 'C4', label: 'C4' },
    { value: 'C5', label: 'C5' },
    { value: 'C5_AIRCROSS', label: 'C5 Aircross' },
    { value: 'BERLINGO', label: 'Berlingo' },
    { value: 'JUMPY', label: 'Jumpy' },
    { value: 'JUMPER', label: 'Jumper' }
  ],
  CUPRA: [
    { value: 'ATECA', label: 'Ateca' },
    { value: 'BORN', label: 'Born' },
    { value: 'FORMENTOR', label: 'Formentor' },
    { value: 'LEON', label: 'Leon' }
  ],
  DACIA: [
    { value: 'DUSTER', label: 'Duster' },
    { value: 'JOGGER', label: 'Jogger' },
    { value: 'LOGAN', label: 'Logan' },
    { value: 'SANDERO', label: 'Sandero' },
    { value: 'SPRING', label: 'Spring' }
  ],
  DS: [
    { value: 'DS3', label: 'DS 3' },
    { value: 'DS4', label: 'DS 4' },
    { value: 'DS7', label: 'DS 7' },
    { value: 'DS9', label: 'DS 9' }
  ],
  FIAT: [
    { value: '500', label: '500' },
    { value: '500L', label: '500L' },
    { value: '500X', label: '500X' },
    { value: 'DOBLO', label: 'Doblo' },
    { value: 'FIORINO', label: 'Fiorino' },
    { value: 'PANDA', label: 'Panda' },
    { value: 'TIPO', label: 'Tipo' }
  ],
  FORD: [
    { value: 'FOCUS', label: 'Focus' },
    { value: 'FIESTA', label: 'Fiesta' },
    { value: 'PUMA', label: 'Puma' },
    { value: 'KUGA', label: 'Kuga' },
    { value: 'ECOSPORT', label: 'EcoSport' },
    { value: 'MONDEO', label: 'Mondeo' },
    { value: 'RANGER', label: 'Ranger' },
    { value: 'TRANSIT', label: 'Transit' }
  ],
  HONDA: [
    { value: 'CIVIC', label: 'Civic' },
    { value: 'CRV', label: 'CR-V' },
    { value: 'HRV', label: 'HR-V' },
    { value: 'JAZZ', label: 'Jazz' }
  ],
  HYUNDAI: [
    { value: 'I10', label: 'i10' },
    { value: 'I20', label: 'i20' },
    { value: 'I30', label: 'i30' },
    { value: 'KONA', label: 'Kona' },
    { value: 'TUCSON', label: 'Tucson' },
    { value: 'SANTA_FE', label: 'Santa Fe' },
    { value: 'IONIQ', label: 'IONIQ' }
  ],
  JAGUAR: [
    { value: 'E_PACE', label: 'E-Pace' },
    { value: 'F_PACE', label: 'F-Pace' },
    { value: 'F_TYPE', label: 'F-Type' },
    { value: 'XF', label: 'XF' },
    { value: 'XE', label: 'XE' }
  ],
  JEEP: [
    { value: 'AVENGER', label: 'Avenger' },
    { value: 'CHEROKEE', label: 'Cherokee' },
    { value: 'COMPASS', label: 'Compass' },
    { value: 'RENEGADE', label: 'Renegade' },
    { value: 'WRANGLER', label: 'Wrangler' }
  ],
  KIA: [
    { value: 'CEED', label: 'Ceed' },
    { value: 'EV6', label: 'EV6' },
    { value: 'NIRO', label: 'Niro' },
    { value: 'PICANTO', label: 'Picanto' },
    { value: 'SPORTAGE', label: 'Sportage' },
    { value: 'STONIC', label: 'Stonic' },
    { value: 'SORENTO', label: 'Sorento' }
  ],
  LAND_ROVER: [
    { value: 'DEFENDER', label: 'Defender' },
    { value: 'DISCOVERY', label: 'Discovery' },
    { value: 'DISCOVERY_SPORT', label: 'Discovery Sport' },
    { value: 'RANGE_ROVER', label: 'Range Rover' },
    { value: 'RANGE_ROVER_EVOQUE', label: 'Range Rover Evoque' },
    { value: 'RANGE_ROVER_SPORT', label: 'Range Rover Sport' }
  ],
  LEXUS: [
    { value: 'CT', label: 'CT' },
    { value: 'IS', label: 'IS' },
    { value: 'NX', label: 'NX' },
    { value: 'RX', label: 'RX' },
    { value: 'UX', label: 'UX' }
  ],
  MAZDA: [
    { value: 'CX_3', label: 'CX-3' },
    { value: 'CX_30', label: 'CX-30' },
    { value: 'CX_5', label: 'CX-5' },
    { value: 'CX_60', label: 'CX-60' },
    { value: 'MAZDA2', label: 'Mazda2' },
    { value: 'MAZDA3', label: 'Mazda3' },
    { value: 'MX_5', label: 'MX-5' }
  ],
  MERCEDES: [
    { value: 'CLASSE_A', label: 'Classe A' },
    { value: 'CLASSE_B', label: 'Classe B' },
    { value: 'CLASSE_C', label: 'Classe C' },
    { value: 'CLASSE_E', label: 'Classe E' },
    { value: 'CLASSE_S', label: 'Classe S' },
    { value: 'GLA', label: 'GLA' },
    { value: 'GLB', label: 'GLB' },
    { value: 'GLC', label: 'GLC' },
    { value: 'GLE', label: 'GLE' },
    { value: 'GLS', label: 'GLS' },
    { value: 'EQC', label: 'EQC' }
  ],
  MINI: [
    { value: 'COUNTRYMAN', label: 'Countryman' },
    { value: 'CLUBMAN', label: 'Clubman' },
    { value: 'MINI', label: 'Mini' }
  ],
  MITSUBISHI: [
    { value: 'ASX', label: 'ASX' },
    { value: 'ECLIPSE_CROSS', label: 'Eclipse Cross' },
    { value: 'L200', label: 'L200' },
    { value: 'OUTLANDER', label: 'Outlander' }
  ],
  NISSAN: [
    { value: 'JUKE', label: 'Juke' },
    { value: 'LEAF', label: 'Leaf' },
    { value: 'MICRA', label: 'Micra' },
    { value: 'QASHQAI', label: 'Qashqai' },
    { value: 'X_TRAIL', label: 'X-Trail' }
  ],
  OPEL: [
    { value: 'ADAM', label: 'Adam' },
    { value: 'ASTRA', label: 'Astra' },
    { value: 'CORSA', label: 'Corsa' },
    { value: 'CROSSLAND', label: 'Crossland' },
    { value: 'GRANDLAND', label: 'Grandland' },
    { value: 'MOKKA', label: 'Mokka' }
  ],
  PEUGEOT: [
    { value: '108', label: '108' },
    { value: '208', label: '208' },
    { value: '308', label: '308' },
    { value: '408', label: '408' },
    { value: '508', label: '508' },
    { value: '2008', label: '2008' },
    { value: '3008', label: '3008' },
    { value: '5008', label: '5008' },
    { value: 'PARTNER', label: 'Partner' },
    { value: 'RIFTER', label: 'Rifter' },
    { value: 'EXPERT', label: 'Expert' }
  ],
  PORSCHE: [
    { value: '718', label: '718' },
    { value: '911', label: '911' },
    { value: 'CAYENNE', label: 'Cayenne' },
    { value: 'MACAN', label: 'Macan' },
    { value: 'PANAMERA', label: 'Panamera' },
    { value: 'TAYCAN', label: 'Taycan' }
  ],
  RENAULT: [
    { value: 'ARKANA', label: 'Arkana' },
    { value: 'AUSTRAL', label: 'Austral' },
    { value: 'CAPTUR', label: 'Captur' },
    { value: 'CLIO', label: 'Clio' },
    { value: 'ESPACE', label: 'Espace' },
    { value: 'KADJAR', label: 'Kadjar' },
    { value: 'KANGOO', label: 'Kangoo' },
    { value: 'KOLEOS', label: 'Koleos' },
    { value: 'MEGANE', label: 'Mégane' },
    { value: 'SCENIC', label: 'Scénic' },
    { value: 'TRAFIC', label: 'Trafic' },
    { value: 'TWINGO', label: 'Twingo' },
    { value: 'ZOE', label: 'Zoe' }
  ],
  SEAT: [
    { value: 'ARONA', label: 'Arona' },
    { value: 'ATECA', label: 'Ateca' },
    { value: 'IBIZA', label: 'Ibiza' },
    { value: 'LEON', label: 'Leon' },
    { value: 'TARRACO', label: 'Tarraco' }
  ],
  SKODA: [
    { value: 'FABIA', label: 'Fabia' },
    { value: 'KAMIQ', label: 'Kamiq' },
    { value: 'KAROQ', label: 'Karoq' },
    { value: 'KODIAQ', label: 'Kodiaq' },
    { value: 'OCTAVIA', label: 'Octavia' },
    { value: 'SCALA', label: 'Scala' },
    { value: 'SUPERB', label: 'Superb' }
  ],
  SUBARU: [
    { value: 'FORESTER', label: 'Forester' },
    { value: 'IMPREZA', label: 'Impreza' },
    { value: 'OUTBACK', label: 'Outback' },
    { value: 'XV', label: 'XV' }
  ],
  SUZUKI: [
    { value: 'IGNIS', label: 'Ignis' },
    { value: 'JIMNY', label: 'Jimny' },
    { value: 'SWIFT', label: 'Swift' },
    { value: 'S_CROSS', label: 'S-Cross' },
    { value: 'VITARA', label: 'Vitara' }
  ],
  TESLA: [
    { value: 'MODEL_3', label: 'Model 3' },
    { value: 'MODEL_S', label: 'Model S' },
    { value: 'MODEL_X', label: 'Model X' },
    { value: 'MODEL_Y', label: 'Model Y' }
  ],
  TOYOTA: [
    { value: 'AYGO', label: 'Aygo' },
    { value: 'AURIS', label: 'Auris' },
    { value: 'C_HR', label: 'C-HR' },
    { value: 'COROLLA', label: 'Corolla' },
    { value: 'HILUX', label: 'Hilux' },
    { value: 'PRIUS', label: 'Prius' },
    { value: 'RAV4', label: 'RAV4' },
    { value: 'YARIS', label: 'Yaris' }
  ],
  VOLKSWAGEN: [
    { value: 'GOLF', label: 'Golf' },
    { value: 'ID3', label: 'ID.3' },
    { value: 'ID4', label: 'ID.4' },
    { value: 'PASSAT', label: 'Passat' },
    { value: 'POLO', label: 'Polo' },
    { value: 'T_CROSS', label: 'T-Cross' },
    { value: 'T_ROC', label: 'T-Roc' },
    { value: 'TIGUAN', label: 'Tiguan' },
    { value: 'TOURAN', label: 'Touran' },
    { value: 'TRANSPORTER', label: 'Transporter' }
  ],
  VOLVO: [
    { value: 'S60', label: 'S60' },
    { value: 'S90', label: 'S90' },
    { value: 'V60', label: 'V60' },
    { value: 'V90', label: 'V90' },
    { value: 'XC40', label: 'XC40' },
    { value: 'XC60', label: 'XC60' },
    { value: 'XC90', label: 'XC90' }
  ],
  AUTRE: [
    { value: 'AUTRE', label: 'Autre' }
  ]
} as const satisfies Record<VehicleBrandValue, readonly { value: string; label: string }[]>;

export type VehicleModelValue = (typeof VEHICLE_MODEL_OPTIONS)[keyof typeof VEHICLE_MODEL_OPTIONS][number]['value'];
