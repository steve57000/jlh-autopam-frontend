import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, Observable } from 'rxjs';
import { expand, map, reduce } from 'rxjs/operators';
import { environment } from '@environments/environment';
import type {
  AvisServiceCreatePayload,
  AvisServiceDto,
  AvisServiceModerationPayload,
  AvisServiceStatsDto,
  PagedResponse,
  SpringPagedModel
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

  // ✅ NOUVEAU: récupère tous les avis APPROVED (tous services confondus) paginés
  getApprovedAvisPage(params: AvisQueryParams = {}): Observable<PagedResponse<AvisServiceDto>> {
    const httpParams = this.buildParams({
      page: params.page ?? 0,
      size: params.size ?? 10,
      sort: params.sort ?? 'creeLe,desc'
    });
    return this.http.get<SpringPagedModel<AvisServiceDto>>(this.base, { params: httpParams }).pipe(
      map(response => this.normalizePagedResponse(response, params.size ?? 10))
    );
  }

  // ✅ Optionnel: route filtrée (service/demande/client) si tu en as besoin ailleurs
  getAvisPage(
    filter: { serviceId?: number; demandeId?: number; clientId?: number; statut?: string },
    params: AvisQueryParams = {}
  ): Observable<PagedResponse<AvisServiceDto>> {
    let httpParams = this.buildParams(params);
    if (filter.serviceId != null) httpParams = httpParams.set('serviceId', String(filter.serviceId));
    if (filter.demandeId != null) httpParams = httpParams.set('demandeId', String(filter.demandeId));
    if (filter.clientId != null) httpParams = httpParams.set('clientId', String(filter.clientId));
    if (filter.statut) httpParams = httpParams.set('statut', filter.statut);
    return this.http.get<SpringPagedModel<AvisServiceDto>>(this.base, {params: httpParams}).pipe(
      map(response => this.normalizePagedResponse(response, params.size ?? 10))
    );
  }


  getAllAvisByService(serviceId: number, params: AvisQueryParams = {}): Observable<AvisServiceDto[]> {
    const size = params.size ?? 50;
    const sort = params.sort ?? 'creeLe,desc';

    return this.getAvisByService(serviceId, { page: 0, size, sort }).pipe(
      map(response => this.normalizePagedResponse(response, size)),
      expand(response => {
        const nextPage = response.number + 1;
        if (nextPage >= response.totalPages) {
          return EMPTY;
        }
        return this.getAvisByService(serviceId, { page: nextPage, size, sort });
      }),
      map(response => response.content ?? []),
      reduce((acc, chunk) => acc.concat(chunk), [] as AvisServiceDto[])
    );
  }

  /**
   * ✅ Détail d'un avis (protégé côté backend actuellement)
   */
  getAvisDetail(avisId: number): Observable<AvisServiceDto> {
    return this.http.get<AvisServiceDto>(`${this.base}/${avisId}`);
  }

  getAvisByDemande(demandeId: number, params: AvisQueryParams = {}): Observable<PagedResponse<AvisServiceDto>> {
    return this.getAvisPage({ demandeId }, params);
  }

  getAvisByClient(clientId: number, params: AvisQueryParams = {}): Observable<PagedResponse<AvisServiceDto>> {
    return this.getAvisPage({ clientId }, params);
  }

  createAvis(payload: AvisServiceCreatePayload): Observable<AvisServiceDto> {
    return this.http.post<AvisServiceDto>(this.base, payload);
  }


  moderateAvis(avisId: number, payload: AvisServiceModerationPayload): Observable<AvisServiceDto> {
    return this.http.patch<AvisServiceDto>(`${this.base}/${avisId}/moderation`, payload);
  }

  /**
   * ⚠️ Tu as encore ces endpoints dans ton frontend:
   * /services/{id}/avis et /services/{id}/avis/stats
   * Je les garde si tu les utilises ailleurs, mais Home n'en dépend plus.
   */
  getAvisByService(serviceId: number, params: AvisQueryParams = {}): Observable<PagedResponse<AvisServiceDto>> {
    const httpParams = this.buildParams(params);
    return this.http.get<SpringPagedModel<AvisServiceDto>>(
      `${environment.apiBaseUrl}/services/${serviceId}/avis`,
      { params: httpParams }
    ).pipe(
      map(response => this.normalizePagedResponse(response, params.size ?? 10))
    );
  }

  getAvisStats(serviceId: number): Observable<AvisServiceStatsDto> {
    return this.http.get<AvisServiceStatsDto>(`${environment.apiBaseUrl}/services/${serviceId}/avis/stats`);
  }


  private normalizePagedResponse(response: SpringPagedModel<AvisServiceDto> | null | undefined, fallbackSize: number): PagedResponse<AvisServiceDto> {
    if (!response || typeof response !== 'object') {
      return { content: [], totalPages: 1, number: 0, totalElements: 0, size: fallbackSize };
    }

    const pageMeta = response.page ?? {};
    const content = response.content ?? [];
    const size = Number.isFinite(response.size)
      ? Number(response.size)
      : Number.isFinite(pageMeta.size)
        ? Number(pageMeta.size)
        : fallbackSize;
    const number = Number.isFinite(response.number)
      ? Number(response.number)
      : Number.isFinite(pageMeta.number)
        ? Number(pageMeta.number)
        : 0;
    const totalPages = Number.isFinite(response.totalPages)
      ? Number(response.totalPages)
      : Number.isFinite(pageMeta.totalPages)
        ? Number(pageMeta.totalPages)
        : 1;
    const totalElements = Number.isFinite(response.totalElements)
      ? Number(response.totalElements)
      : Number.isFinite(pageMeta.totalElements)
        ? Number(pageMeta.totalElements)
        : content.length;

    return { content, size, number, totalPages, totalElements };
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
