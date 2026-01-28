export type GarageHourScope = 'ANNUAL' | 'EXCEPTIONAL';
export type GarageHourStatus = 'OPEN' | 'CLOSED';
export type GarageHourOpeningType = 'CONTINUOUS' | 'SPLIT';
export type GarageHourExceptionalType = 'SINGLE_DAY' | 'PERIOD';

export interface GarageHourDto {
  id?: number;
  idGarageHour?: number;
  id_garage_hour?: number;
  scope: GarageHourScope;
  status: GarageHourStatus;
  openingType?: GarageHourOpeningType | null;
  dayOfWeek?: string | null;
  exceptionalType?: GarageHourExceptionalType | null;
  exceptionalDate?: string | null;
  exceptionalStartDate?: string | null;
  exceptionalEndDate?: string | null;
  label?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  startTime2?: string | null;
  endTime2?: string | null;
}

export type GarageHourPayload = Omit<GarageHourDto, 'id'>;
