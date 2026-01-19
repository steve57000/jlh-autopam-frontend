import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {environment} from 'environments/environment';
import { ServiceDto } from '../modeles/service.model';

@Injectable({ providedIn: 'root' })
export class ServicesService {
  private api = `${environment.apiBaseUrl}/services`;

  constructor(private http: HttpClient) {}

  // --- Admin CRUD ---

  getAll(): Observable<ServiceDto[]> {
    return this.http.get<ServiceDto[]>(this.api);
  }
  getById(id: number): Observable<ServiceDto> {
    return this.http.get<ServiceDto>(`${this.api}/${id}`);
  }
  create(service: ServiceDto): Observable<ServiceDto> {
    return this.http.post<ServiceDto>(this.api, service);
  }
  update(id: number, service: ServiceDto): Observable<ServiceDto> {
    return this.http.put<ServiceDto>(`${this.api}/${id}`, service);
  }
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  // --- Accès public ---
  /** Pour lister les services visibles par un visiteur non-authentifié */
  getPublicServices(): Observable<ServiceDto[]> {
    return this.http.get<ServiceDto[]>(`${this.api}`);
  }
}
