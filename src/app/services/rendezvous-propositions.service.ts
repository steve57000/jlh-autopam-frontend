import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import {
  RendezVousProposition,
  RendezVousPropositionBatchPayload
} from '../modeles/rendezvous-proposition.model';

@Injectable({ providedIn: 'root' })
export class RendezVousPropositionsService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/demandes`;

  listByDemande(demandeId: number) {
    return this.http.get<RendezVousProposition[]>(
      `${this.base}/${demandeId}/rendezvous-propositions`
    );
  }

  create(demandeId: number, payload: RendezVousPropositionBatchPayload) {
    return this.http.post<RendezVousProposition[]>(
      `${this.base}/${demandeId}/rendezvous-propositions`,
      payload
    );
  }

  accept(demandeId: number, propositionId: number) {
    return this.http.patch<RendezVousProposition>(
      `${this.base}/${demandeId}/rendezvous-propositions/${propositionId}/accept`,
      {}
    );
  }

  decline(demandeId: number, propositionId: number) {
    return this.http.patch<RendezVousProposition>(
      `${this.base}/${demandeId}/rendezvous-propositions/${propositionId}/decline`,
      {}
    );
  }
}
