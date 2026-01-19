import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { ServiceIconDto } from '../modeles/service-icon.model';

export interface ServiceIconPayload {
  url?: string;
  label?: string | null;
  file?: File | null;
}

@Injectable({ providedIn: 'root' })
export class ServiceIconsService {
  private api = `${environment.apiBaseUrl}/service-icons`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ServiceIconDto[]> {
    return this.http.get<ServiceIconDto[]>(this.api);
  }

  create(payload: ServiceIconPayload): Observable<ServiceIconDto> {
    if (payload.file) {
      const formData = new FormData();
      formData.append('file', payload.file);
      if (payload.label) {
        formData.append('label', payload.label);
      }
      return this.http.post<ServiceIconDto>(this.api, formData);
    }
    return this.http.post<ServiceIconDto>(this.api, {
      url: payload.url ?? '',
      label: payload.label ?? null
    });
  }

  update(id: number, payload: ServiceIconPayload): Observable<ServiceIconDto> {
    if (payload.file) {
      const formData = new FormData();
      formData.append('file', payload.file);
      if (payload.label) {
        formData.append('label', payload.label);
      }
      return this.http.put<ServiceIconDto>(`${this.api}/${id}`, formData);
    }
    return this.http.put<ServiceIconDto>(`${this.api}/${id}`, {
      url: payload.url ?? '',
      label: payload.label ?? null
    });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
