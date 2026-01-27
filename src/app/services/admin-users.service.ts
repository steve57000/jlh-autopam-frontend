import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface AdminUserPayload {
  email: string;
  username?: string | null;
  motDePasse: string;
  nom?: string | null;
  prenom?: string | null;
  niveauAcces: 'ADMIN' | 'GESTIONNAIRE';
}

export interface AdminUserSummary {
  id?: number;
  idAdministrateur?: number;
  idAdmin?: number;
  id_admin?: number;
  email: string;
  username?: string | null;
  nom?: string | null;
  prenom?: string | null;
  niveauAcces: 'ADMIN' | 'GESTIONNAIRE' | 'PRINCIPAL';
  niveau_acces?: string | null;
}

export interface AdminUserUpdatePayload {
  email: string;
  username?: string | null;
  nom?: string | null;
  prenom?: string | null;
  niveauAcces: 'ADMIN' | 'GESTIONNAIRE' | 'PRINCIPAL';
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

  listAdmins() {
    return this.http.get<AdminUserSummary[]>(this.api, this.skipToastOptions());
  }

  updateAdmin(id: number, payload: AdminUserUpdatePayload) {
    return this.http.put(`${this.api}/${id}`, payload, this.skipToastOptions());
  }

  deleteAdmin(id: number) {
    return this.http.delete(`${this.api}/${id}`, this.skipToastOptions());
  }
}
