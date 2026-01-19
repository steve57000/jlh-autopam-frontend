import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '@environments/environment';
import type { DemandeTypeCode } from '../modeles/demande.model';

export interface TypeDemandeLookupDto {
  codeType: DemandeTypeCode | string;
  libelle?: string;
}

export interface StatutDemandeLookupDto {
  codeStatut: string;
  libelle?: string;
}

export interface StatutRendezVousLookupDto {
  codeStatut: string;
  libelle?: string;
}

@Injectable({ providedIn: 'root' })
export class LookupsService {
  private http = inject(HttpClient);
  private api = environment.apiBaseUrl;

  private typeDemandes$?: Observable<TypeDemandeLookupDto[]>;
  private statutDemandes$?: Observable<StatutDemandeLookupDto[]>;
  private statutRendezVous$?: Observable<StatutRendezVousLookupDto[]>;

  getTypeDemandes(): Observable<TypeDemandeLookupDto[]> {
    if (!this.typeDemandes$) {
      this.typeDemandes$ = this.http
        .get<TypeDemandeLookupDto[]>(`${this.api}/type-demandes`)
        .pipe(shareReplay(1));
    }
    return this.typeDemandes$;
  }

  getStatutDemandes(): Observable<StatutDemandeLookupDto[]> {
    if (!this.statutDemandes$) {
      this.statutDemandes$ = this.http
        .get<StatutDemandeLookupDto[]>(`${this.api}/statut-demandes`)
        .pipe(shareReplay(1));
    }
    return this.statutDemandes$;
  }

  getStatutRendezVous(): Observable<StatutRendezVousLookupDto[]> {
    if (!this.statutRendezVous$) {
      this.statutRendezVous$ = this.http
        .get<StatutRendezVousLookupDto[]>(`${this.api}/statut-rendezvous`)
        .pipe(shareReplay(1));
    }
    return this.statutRendezVous$;
  }
}
