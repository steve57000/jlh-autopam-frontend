import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ServiceIconDto } from '../modeles/service-icon.model';

@Injectable({ providedIn: 'root' })
export class ServiceIconsService {
  private api = `${environment.apiBaseUrl}/service-icons`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ServiceIconDto[]> {
    return this.http.get<ServiceIconDto[]>(this.api);
  }

  create(icon: ServiceIconDto): Observable<ServiceIconDto> {
    return this.http.post<ServiceIconDto>(this.api, icon);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
