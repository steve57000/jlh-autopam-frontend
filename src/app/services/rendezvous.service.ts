import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '@environments/environment';
import type { RendezVousSummary } from '../modeles/demande.model';

export interface RendezVousUpsertPayload {
  demandeId: number;
  dateDebut: string;
  dateFin: string;
  codeStatut: string;
  commentaire?: string | null;
  visibleClient?: boolean;
  administrateurId?: number | null;
  creneauId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class RendezVousService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/rendezvous`;

  private skipToastOptions() {
    return { headers: new HttpHeaders({ 'X-Skip-Error-Toast': '1' }) };
  }

  create(payload: RendezVousUpsertPayload) {
    return this.http.post<RendezVousSummary>(this.base, payload, this.skipToastOptions());
  }

  createForService(serviceId: number, payload: RendezVousUpsertPayload) {
    return this.http.post<RendezVousSummary>(
      `${environment.apiBaseUrl}/services/${serviceId}/rendezvous`,
      payload,
      this.skipToastOptions()
    );
  }

  createForDevis(devisId: number, payload: RendezVousUpsertPayload) {
    return this.http.post<RendezVousSummary>(
      `${environment.apiBaseUrl}/devis/${devisId}/rendezvous`,
      payload,
      this.skipToastOptions()
    );
  }

  update(id: number, payload: RendezVousUpsertPayload) {
    return this.http.put<RendezVousSummary>(`${this.base}/${id}`, payload, this.skipToastOptions());
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
