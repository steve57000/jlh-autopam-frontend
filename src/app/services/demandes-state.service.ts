// src/app/services/demandes-state.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, Subject } from 'rxjs';
import { environment } from 'environments/environment';
import { DemandeResponse } from '../modeles/demande.model';

@Injectable({ providedIn: 'root' })
export class DemandesStateService {
  private http = inject(HttpClient);
  private api = environment.apiBaseUrl;
  private cacheId?: number;
  private readonly skipErrorHeaders = new HttpHeaders({ 'X-Skip-Error-Toast': '1' });

  private httpOptions(silent?: boolean) {
    return silent ? { headers: this.skipErrorHeaders } : {};
  }

  /** Flux SSR-safe pour notifier les refreshs (remplace l’événement DOM) */
  readonly refresh$ = new Subject<void>();

  async initDemande(options?: { silent?: boolean }): Promise<number> {
    const resp = await firstValueFrom(
      this.http.post<DemandeResponse>(
        `${this.api}/demandes/current`,
        {},
        this.httpOptions(options?.silent)
      )
    );
    this.cacheId = Number(resp.idDemande);
    return this.cacheId!;
  }

  /** Renvoie la demande courante (brouillon) telle quelle */
  async loadDraft(options?: { silent?: boolean }): Promise<DemandeResponse> {
    const resp = await firstValueFrom(
      this.http.post<DemandeResponse>(
        `${this.api}/demandes/current`,
        {},
        this.httpOptions(options?.silent)
      )
    );
    // gardons l’ID cohérent dans le cache
    this.cacheId = Number(resp.idDemande);
    return resp;
  }

  resetCache() { this.cacheId = undefined; }

  /** Helper pour émettre un refresh (appelé par service-card après ajout) */
  notifyRefresh() { this.refresh$.next(); }
}
