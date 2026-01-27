import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type {
  AvisServiceCreatePayload,
  AvisServiceDto,
  AvisServiceStatsDto,
  PagedResponse
} from '../modeles/avis-service.model';

interface AvisQueryParams {
  page?: number;
  size?: number;
  sort?: string;
}

@Injectable({ providedIn: 'root' })
export class AvisServicesService {
  private base = `${environment.apiBaseUrl}/avis-services`;

  constructor(private http: HttpClient) {}

  getAvisByService(serviceId: number, params: AvisQueryParams = {}): Observable<PagedResponse<AvisServiceDto>> {
    const httpParams = this.buildParams(params);
    return this.http.get<PagedResponse<AvisServiceDto>>(
      `${environment.apiBaseUrl}/services/${serviceId}/avis`,
      { params: httpParams }
    );
  }

  getAvisStats(serviceId: number): Observable<AvisServiceStatsDto> {
    return this.http.get<AvisServiceStatsDto>(`${environment.apiBaseUrl}/services/${serviceId}/avis/stats`);
  }

  getAvisDetail(avisId: number): Observable<AvisServiceDto> {
    return this.http.get<AvisServiceDto>(`${this.base}/${avisId}`);
  }

  getAvisByDemande(demandeId: number, params: AvisQueryParams = {}): Observable<PagedResponse<AvisServiceDto>> {
    const httpParams = this.buildParams(params).set('demandeId', demandeId.toString());
    return this.http.get<PagedResponse<AvisServiceDto>>(this.base, { params: httpParams });
  }

  getAvisByClient(clientId: number, params: AvisQueryParams = {}): Observable<PagedResponse<AvisServiceDto>> {
    const httpParams = this.buildParams(params).set('clientId', clientId.toString());
    return this.http.get<PagedResponse<AvisServiceDto>>(this.base, { params: httpParams });
  }

  createAvis(payload: AvisServiceCreatePayload): Observable<AvisServiceDto> {
    return this.http.post<AvisServiceDto>(this.base, payload);
  }

  private buildParams(params: AvisQueryParams): HttpParams {
    let httpParams = new HttpParams();
    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.size !== undefined) {
      httpParams = httpParams.set('size', params.size.toString());
    }
    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }
    return httpParams;
  }
}
