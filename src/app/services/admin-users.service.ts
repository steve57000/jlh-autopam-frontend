import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'environments/environment';

export interface AdminUserPayload {
  email: string;
  username?: string | null;
  motDePasse: string;
  nom?: string | null;
  prenom?: string | null;
  niveauAcces: 'ADMIN' | 'GESTIONNAIRE';
}

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private http = inject(HttpClient);
  private api = `${environment.apiBaseUrl}/administrateurs`;

  private skipToastOptions() {
    return { headers: new HttpHeaders({ 'X-Skip-Error-Toast': '1' }) };
  }

  createAdmin(payload: AdminUserPayload) {
    return this.http.post(this.api, payload, this.skipToastOptions());
  }
}
