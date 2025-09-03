// src/app/services/demandes-state.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of, Subject } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { DemandeResponse } from './client-dashboard.service';

@Injectable({ providedIn: 'root' })
export class DemandesStateService {
  private http = inject(HttpClient);
  private api = environment.apiBaseUrl;
  private cacheId?: number;

  /** Flux SSR-safe pour notifier les refreshs (remplace l’événement DOM) */
  readonly refresh$ = new Subject<void>();

  async initDemande(): Promise<number> {
    if (this.cacheId) return this.cacheId;
    const resp = await firstValueFrom(
      this.http.post<DemandeResponse>(`${this.api}/demandes/current`, {})
    );
    this.cacheId = Number(resp.idDemande);
    return this.cacheId!;
  }

  /** Renvoie la demande courante (brouillon) telle quelle */
  async loadDraft(): Promise<DemandeResponse> {
    const resp = await firstValueFrom(
      this.http.post<DemandeResponse>(`${this.api}/demandes/current`, {})
    );
    return resp;
  }

  resetCache() { this.cacheId = undefined; }

  /** Helper pour émettre un refresh (appelé par service-card après ajout) */
  notifyRefresh() { this.refresh$.next(); }
}
