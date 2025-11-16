import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface RequestOptions {
  silentError?: boolean;
}

// Types déjà utilisés côté composant
export interface DemandeServiceDto {
  idService: number;
  libelle: string;
  prixUnitaire: number;
  quantite: number;
}
export interface TypeDemandeDto { codeType: string; libelle?: string; }
export interface StatutDemandeDto { codeStatut: string; libelle?: string; }

export interface ClientSummaryDto {
  idClient: number;
  nom: string;
  prenom?: string;
  email: string;
  telephone?: string | null;
  immatriculation?: string | null;
  vehiculeMarque?: string | null;
  vehiculeModele?: string | null;
  adresseLigne1?: string | null;
  adresseLigne2?: string | null;
  codePostal?: string | null;
  ville?: string | null;
}

export interface DemandeDocumentDto {
  idDocument?: number;
  nom: string;
  url: string;
  tailleKo?: number;
  visibleClient?: boolean;
  mimeType?: string;
  createdAt?: string;
}

export interface DemandeTimelineEntryDto {
  id?: number;
  type: string;
  source?: string;
  createdAt?: string;
  createdBy?: string;
  createdByRole?: string;
  visibleClient?: boolean;
  commentaire?: string;
  montantValide?: number;
  statut?: StatutDemandeDto;
  document?: DemandeDocumentDto;
  rendezVous?: RendezVousSummary;
}

export interface RendezVousSummary {
  idRdv: number;
  codeStatut: string;
  libelleStatut?: string;
  dateDebut: string;
  dateFin: string;
  creneau?: {
    idCreneau: number;
    dateDebut: string;
    dateFin: string;
    statut?: { codeStatut: string; libelle?: string };
  };
}

export interface DemandeResponse {
  idDemande: number;
  dateDemande?: string;
  dateSoumission?: string;
  typeDemande?: TypeDemandeDto;
  statutDemande?: StatutDemandeDto;
  services?: DemandeServiceDto[];
  client?: ClientSummaryDto;
  documents?: DemandeDocumentDto[];
  timeline?: DemandeTimelineEntryDto[];
  rendezVous?: RendezVousSummary | null;
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
}
