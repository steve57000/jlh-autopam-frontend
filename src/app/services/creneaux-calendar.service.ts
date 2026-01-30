import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface CreneauCalendarEntryDto {
  idCreneau?: number | null;
  dateDebut: string;
  dateFin: string;
  codeStatut: 'Libre' | 'Reserve' | 'Indisponible' | string;
  libelleStatut?: string;
}

@Injectable({ providedIn: 'root' })
export class CreneauxCalendarService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/creneaux/calendrier`;

  getCalendar(params: { start: string; end: string; slotMinutes?: number }) {
    const httpParams = new HttpParams({ fromObject: {
      start: params.start,
      end: params.end,
      ...(params.slotMinutes ? { slotMinutes: String(params.slotMinutes) } : {})
    }});
    return this.http.get<CreneauCalendarEntryDto[]>(this.base, { params: httpParams });
  }
}
