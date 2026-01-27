// src/app/services/demandes-state.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
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

  private isDraftEditable(demande?: DemandeResponse | null): boolean {
    const statut = demande?.statutDemande?.codeStatut;
    return !statut || statut === 'Brouillon';
  }

  private async fetchCurrentDraft(
    options?: { silent?: boolean }
  ): Promise<DemandeResponse | null> {
    try {
      return await firstValueFrom(
        this.http.post<DemandeResponse>(
          `${this.api}/demandes/current`,
          {},
          this.httpOptions(options?.silent)
        )
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse && (error.status === 409 || error.status === 404)) {
        return null;
      }
      throw error;
    }
  }

  private async createDraft(options?: { silent?: boolean }): Promise<DemandeResponse> {
    return firstValueFrom(
      this.http.post<DemandeResponse>(
        `${this.api}/demandes`,
        {},
        this.httpOptions(options?.silent)
      )
    );
  }

  async initDemande(options?: { silent?: boolean }): Promise<number> {
    const current = await this.fetchCurrentDraft(options);

    if (!current || !this.isDraftEditable(current)) {
      const created = await this.createDraft(options);
      this.cacheId = Number(created.idDemande);
      return this.cacheId!;
    }

    this.cacheId = Number(current.idDemande);
    return this.cacheId!;
  }

  /** Renvoie la demande courante (brouillon) ou en crée une nouvelle si nécessaire */
  async loadDraft(options?: { silent?: boolean }): Promise<DemandeResponse | null> {
    const resp = await this.fetchCurrentDraft(options);
    // gardons l’ID cohérent dans le cache
    if (resp && this.isDraftEditable(resp)) {
      this.cacheId = Number(resp.idDemande);
      return resp;
    }

    this.cacheId = undefined;
    try {
      const created = await this.createDraft(options);
      this.cacheId = Number(created.idDemande);
      return created;
    } catch {
      return null;
    }
  }

  resetCache() { this.cacheId = undefined; }

  /** Helper pour émettre un refresh (appelé par service-card après ajout) */
  notifyRefresh() { this.refresh$.next(); }
}
