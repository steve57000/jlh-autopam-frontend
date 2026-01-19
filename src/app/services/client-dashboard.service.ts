import { Injectable } from '@angular/core';
import {HttpClient, HttpErrorResponse, HttpHeaders} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import { environment } from 'environments/environment';
import type {
  ClientSummaryDto,
  ClientDocumentDto,
  DemandeDocumentDto,
  DemandeResponse,
  DemandeServiceDto,
  DemandeTimelineEntryDto,
  RendezVousSummary
} from '../modeles/demande.model';
import {DemandeServiceRequest, DemandeServiceResponse} from '../modeles/demande-service.model';
import {catchError} from 'rxjs/operators';

interface RequestOptions {
  silentError?: boolean;
}

export interface ClientStatsDto {
  enAttente: number;
  traitees: number;
  annulees: number;
  rdvAvenir: number;
  demandesLibres: number;
  demandesService: number;
  demandesDevis: number;
  rdvLies: number;
  rdvNonLies: number;
}
export interface ProchainRdvDto {
  idRdv: number;
  codeStatut: string;
  libelleStatut?: string;
  dateDebut: string;
  dateFin: string;
}

@Injectable({ providedIn: 'root' })
export class ClientDashboardService {
  private base = `${environment.apiBaseUrl}/demandes`;

  constructor(private http: HttpClient) {
  }

  private buildOptions(options?: RequestOptions) {
    if (options?.silentError) {
      return {
        headers: new HttpHeaders({ 'X-Skip-Error-Toast': '1' })
      };
    }
    return {};
  }

  getMyDemandes(options?: RequestOptions): Observable<DemandeResponse[]> {
    return this.http.get<DemandeResponse[]>(`${this.base}/mes-demandes`, this.buildOptions(options));
  }

  getMyStats(options?: RequestOptions): Observable<ClientStatsDto> {
    return this.http.get<ClientStatsDto>(`${this.base}/mes-demandes/stats`, this.buildOptions(options));
  }

  getProchainRdv(options?: RequestOptions): Observable<ProchainRdvDto | null> {
    return this.http.get<ProchainRdvDto | null>(`${this.base}/mes-demandes/prochain-rdv`, this.buildOptions(options));
  }

  getMyDocuments(options?: RequestOptions): Observable<ClientDocumentDto[]> {
    return this.http.get<ClientDocumentDto[]>(`${this.base}/mes-documents`, this.buildOptions(options));
  }

  getProchainRdvIcs() {
    return this.http.get(`${this.base}/mes-demandes/prochain-rdv.ics`, {
      responseType: 'blob',
      observe: 'response',
      headers: new HttpHeaders({
        // Laisse le serveur répondre en text/calendar
        'Accept': 'text/calendar, text/plain, */*'
      })
    });
  }

  getRendezVousIcs(rdvId: number) {
    return this.http.get(`${this.base}/rendezvous/${rdvId}/ics`, {
      responseType: 'blob',
      observe: 'response',
      headers: new HttpHeaders({
        'Accept': 'text/calendar, text/plain, */*'
      })
    });
  }

  downloadDocumentResponse(demandeId: number, documentId: number) {
    const url = `${this.base}/${demandeId}/documents/client/${documentId}`;

    // NE PAS ajouter manuellement Authorization : l'interceptor s'en charge.
    return this.http.get(url, {
      observe: 'response',
      responseType: 'blob',
    });
  }

}

export type {
  DemandeResponse,
  DemandeServiceDto,
  ClientSummaryDto,
  ClientDocumentDto,
  DemandeDocumentDto,
  DemandeTimelineEntryDto,
  RendezVousSummary
} from '../modeles/demande.model';
