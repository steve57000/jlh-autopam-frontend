import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { GarageHourDto, GarageHourPayload } from '../modeles/garage-hours.model';

@Injectable({
  providedIn: 'root'
})
export class GarageHoursService {
  private readonly base = `${environment.apiBaseUrl}/garage-hours`;

  constructor(private http: HttpClient) {}

  listPublic() {
    return this.http.get<GarageHourDto[]>(this.base);
  }

  getPublic(id: number) {
    return this.http.get<GarageHourDto>(`${this.base}/${id}`);
  }

  create(payload: GarageHourPayload) {
    return this.http.post<GarageHourDto>(this.base, payload);
  }

  update(id: number, payload: GarageHourPayload) {
    return this.http.put<GarageHourDto>(`${this.base}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
