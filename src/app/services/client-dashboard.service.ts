import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Types déjà utilisés côté composant
export interface DemandeServiceDto {
  idService: number;
  libelle: string;
  prixUnitaire: number;
  quantite: number;
}
export interface TypeDemandeDto { codeType: string; libelle?: string; }
export interface StatutDemandeDto { codeStatut: string; libelle?: string; }

export interface DemandeResponse {
  idDemande: number;
  dateDemande: string;
  typeDemande?: TypeDemandeDto;
  statutDemande?: StatutDemandeDto;
  services?: DemandeServiceDto[];
}

export interface ClientStatsDto {
  enAttente: number; traitees: number; annulees: number; rdvAvenir: number;
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

  getMyDemandes(): Observable<DemandeResponse[]> {
    return this.http.get<DemandeResponse[]>(`${this.base}/mes-demandes`);
  }

  getMyStats(): Observable<ClientStatsDto> {
    return this.http.get<ClientStatsDto>(`${this.base}/mes-demandes/stats`);
  }

  getProchainRdv(): Observable<ProchainRdvDto | null> {
    return this.http.get<ProchainRdvDto | null>(`${this.base}/mes-demandes/prochain-rdv`);
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
}
