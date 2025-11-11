// src/app/services/client-account.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ClientMeDto {
  idClient: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  immatriculation?: string | null;
  adresse?: {
    ligne1?: string | null;
    ligne2?: string | null;
    codePostal?: string | null;
    ville?: string | null;
  } | null;
}

export interface UpdateMePayload {
  telephone?: string | null;
  immatriculation?: string | null;
  adresse?: {
    ligne1?: string | null;
    ligne2?: string | null;
    codePostal?: string | null;
    ville?: string | null;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class ClientAccountService {
  private http = inject(HttpClient);
  private api  = environment.apiBaseUrl;

  /** Charge le profil du client connecté */
  async getMe(): Promise<ClientMeDto> {
    return await firstValueFrom(this.http.get<ClientMeDto>(`${this.api}/me`));
  }

  /** Met à jour (partielle) du profil */
  async updateMe(payload: UpdateMePayload): Promise<ClientMeDto> {
    return await firstValueFrom(this.http.patch<ClientMeDto>(`${this.api}/me`, payload));
  }
}
