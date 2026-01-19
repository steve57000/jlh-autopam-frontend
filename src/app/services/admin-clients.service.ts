import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { ClientResponse, CreateClientPayload, UpdateClientPayload } from '../modeles/client.model';

@Injectable({ providedIn: 'root' })
export class AdminClientsService {
  private http = inject(HttpClient);
  private api = `${environment.apiBaseUrl}/clients`;

  private skipToastOptions() {
    return { headers: new HttpHeaders({ 'X-Skip-Error-Toast': '1' }) };
  }

  getAll(options?: { silentError?: boolean }): Observable<ClientResponse[]> {
    const httpOptions = options?.silentError ? this.skipToastOptions() : undefined;
    return this.http.get<ClientResponse[]>(this.api, httpOptions);
  }

  create(payload: CreateClientPayload) {
    return this.http.post<ClientResponse>(this.api, payload, this.skipToastOptions());
  }

  update(idClient: number, payload: UpdateClientPayload) {
    return this.http.put<ClientResponse>(`${this.api}/${idClient}`, payload, this.skipToastOptions());
  }

  anonymize(idClient: number) {
    return this.http.post<{ idClient: number; anonymizedAt: string }>(
      `${this.api}/${idClient}/anonymize`,
      {},
      this.skipToastOptions()
    );
  }
}
