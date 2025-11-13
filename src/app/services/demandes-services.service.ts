import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ⚠️ On réutilise LES TYPES EXISTANTS du modèle
import {
  DemandeWithServices,
  ServiceItem
} from '../modeles/demande.model';

import {
  DemandeServiceRequest,
  DemandeServiceResponse
} from '../modeles/demande-service.model';

@Injectable({ providedIn: 'root' })
export class DemandesServiceService {
  private http = inject(HttpClient);
  private apiBase = environment.apiBaseUrl;

  // ---------- ADMIN : compatibilité historique ----------
  getAll(): Observable<DemandeWithServices[]> {
    return this.http.get<any[]>(`${this.apiBase}/demandes`).pipe(
      map(rows => Array.isArray(rows) ? rows : []),
      map(rows =>
        rows
          .map((d: any) => {
            const toNum = (v: any) => {
              const n = Number(v);
              return Number.isFinite(n) ? n : null;
            };

            const id = toNum(d?.idDemande);
            if (id == null) return null;

            // Normalisation du type sur l’union attendue par le modèle
            const rawType: string | undefined = d?.typeDemande?.codeType;
            const code_type: DemandeWithServices['code_type'] =
              rawType === 'Devis' || rawType === 'RendezVous' || rawType === 'Service'
                ? rawType
                : 'Service';

            const code_statut = (d?.statutDemande?.codeStatut ?? undefined) as DemandeWithServices['code_statut'];
            const date_demande = (d?.dateDemande ?? '') as string;

            const type_libelle = typeof d?.typeDemande?.libelle === 'string' ? d.typeDemande.libelle : undefined;
            const statut_libelle = typeof d?.statutDemande?.libelle === 'string' ? d.statutDemande.libelle : undefined;

            const c = d?.client;
            const client = (c && toNum(c.idClient) != null)
              ? {
                id_client: toNum(c.idClient)!,
                nom: String(c.nom ?? ''),
                prenom: typeof c.prenom === 'string' ? c.prenom : undefined,
                email: String(c.email ?? ''),
                telephone: typeof c.telephone === 'string' ? c.telephone : undefined,
                immatriculation: typeof c.immatriculation === 'string' ? c.immatriculation : undefined,
                adresseLigne1: typeof c.adresseLigne1 === 'string' ? c.adresseLigne1 : null,
                adresseLigne2: typeof c.adresseLigne2 === 'string' ? c.adresseLigne2 : null,
                adresseCodePostal: typeof c.adresseCodePostal === 'string' ? c.adresseCodePostal : null,
                adresseVille: typeof c.adresseVille === 'string' ? c.adresseVille : null
              }
              : undefined;

            const services: ServiceItem[] = Array.isArray(d?.services)
              ? d.services.map((s: any) => ({
                id_service: toNum(s?.idService) ?? -1,
                libelle: String(s?.libelle ?? ''),
                quantite: toNum(s?.quantite) ?? 1,
                prix_unitaire: toNum(s?.prixUnitaire) ?? undefined,
                quantite_max: toNum(s?.quantiteMax ?? s?.quantite_max) ?? undefined
              }))
              : [];

            const out: DemandeWithServices = {
              id_demande: id,
              code_type,
              type_libelle,
              code_statut,
              statut_libelle,
              date_demande,
              client,
              services
            };
            return out;
          })
          .filter(Boolean) as DemandeWithServices[]
      )
    );
  }

  setStatut(id: number, newStatut: 'En_attente' | 'Traitee' | 'Annulee') {
    return this.http.put<void>(`${this.apiBase}/demandes/${id}`, { codeStatut: newStatut });
  }

  updateDemande(
    id: number,
    payload: {
      codeType?: DemandeWithServices['code_type'];
      codeStatut?: DemandeWithServices['code_statut'];
      immatriculation?: string | null;
      telephone?: string | null;
      adresseLigne1?: string | null;
      adresseLigne2?: string | null;
      adresseCodePostal?: string | null;
      adresseVille?: string | null;
      services?: Array<{
        libelle?: string;
        idService: number;
        quantite: number;
        prixUnitaire?: number | null;
      }>;
    },
    options?: { silentError?: boolean }
  ) {
    const body: Record<string, unknown> = {};

    if (payload.codeType) body['codeType'] = payload.codeType;
    if (payload.codeStatut) body['codeStatut'] = payload.codeStatut;
    if ('immatriculation' in payload) body['immatriculation'] = payload.immatriculation;
    if ('telephone' in payload) body['telephone'] = payload.telephone;
    if ('adresseLigne1' in payload) body['adresseLigne1'] = payload.adresseLigne1;
    if ('adresseLigne2' in payload) body['adresseLigne2'] = payload.adresseLigne2;
    if ('adresseCodePostal' in payload) body['adresseCodePostal'] = payload.adresseCodePostal;
    if ('adresseVille' in payload) body['adresseVille'] = payload.adresseVille;
    if (payload.services) body['services'] = payload.services;

    const headers = options?.silentError
      ? new HttpHeaders({ 'X-Skip-Error-Toast': '1' })
      : undefined;

    const httpOptions = headers ? { headers } : undefined;

    return this.http.put<DemandeWithServices>(
      `${this.apiBase}/demandes/${id}`,
      body,
      httpOptions
    );
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.apiBase}/demandes/${id}`);
  }

  // ---------- PAGE SERVICES : nouveau flux ----------
  /** POST simple : un seul service par demande (409 si déjà présent) */
  addUnique(req: DemandeServiceRequest): Observable<DemandeServiceResponse> {
    const payload = {
      demandeId: req.demandeId,
      serviceId: req.serviceId,
      quantite: req.quantite ?? 1
    };
    return this.http.post<DemandeServiceResponse>(`${this.apiBase}/demandes-services`, payload).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  /** Supprimer une ligne du brouillon. */
  deleteLine(demandeId: number, serviceId: number) {
    return this.http.delete<void>(`${this.apiBase}/demandes-services/${demandeId}/${serviceId}`);
  }
}
