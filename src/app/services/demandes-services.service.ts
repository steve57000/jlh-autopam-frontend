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
import type { DemandeDocumentDto, RendezVousSummary, DemandeTimelineEntryDto } from '../modeles/demande.model';

import {
  DemandeServiceRequest,
  DemandeServiceResponse
} from '../modeles/demande-service.model';

@Injectable({ providedIn: 'root' })
export class DemandesServiceService {
  private http = inject(HttpClient);
  private apiBase = environment.apiBaseUrl;

  // ---------- ADMIN : compatibilité historique ----------
  getAll(options?: { silentError?: boolean }): Observable<DemandeWithServices[]> {
    const httpOptions = this.buildOptions(options);
    return this.http.get<any[]>(`${this.apiBase}/demandes`, httpOptions).pipe(
      map(rows => Array.isArray(rows) ? rows : []),
      map(rows =>
        rows
          .map((d: any) => {
            const toNum = (v: any, fallback: number | null = null) => this.toNumber(v, fallback);

            const id = toNum(d?.idDemande);
            if (id == null) return null;

            // Normalisation du type sur l’union attendue par le modèle
            const rawType: string | undefined = d?.typeDemande?.codeType;
            const code_type: DemandeWithServices['code_type'] =
              rawType === 'Devis' || rawType === 'RendezVous' || rawType === 'Service'
                ? rawType
                : 'Service';

            const code_statut = (d?.statutDemande?.codeStatut ?? undefined) as DemandeWithServices['code_statut'];
            const date_demande = (d?.dateDemande ?? d?.dateSoumission ?? '') as string;

            const type_libelle = typeof d?.typeDemande?.libelle === 'string' ? d.typeDemande.libelle : undefined;
            const statut_libelle = typeof d?.statutDemande?.libelle === 'string' ? d.statutDemande.libelle : undefined;

            const normalizeString = (value: unknown): string | null => {
              if (value == null) {
                return null;
              }
              const str = String(value).trim();
              return str.length > 0 ? str : null;
            };

            const c = d?.client;
            const client = (c && toNum(c.idClient) != null)
              ? {
                id_client: toNum(c.idClient)!,
                nom: String(c.nom ?? ''),
                prenom: typeof c.prenom === 'string' ? c.prenom : undefined,
                email: String(c.email ?? ''),
                telephone: normalizeString(c.telephone),
                immatriculation: normalizeString(c.immatriculation),
                adresseLigne1: normalizeString(c.adresseLigne1),
                adresseLigne2: normalizeString(c.adresseLigne2),
                adresseCodePostal: normalizeString(c.adresseCodePostal ?? c.adresse_codePostal),
                adresseVille: normalizeString(c.adresseVille),
                vehiculeMarque: normalizeString(c.vehiculeMarque ?? c.marqueVehicule),
                vehiculeModele: normalizeString(c.vehiculeModele ?? c.modeleVehicule)
              }
              : undefined;

            const services: ServiceItem[] = Array.isArray(d?.services)
              ? d.services.map((s: any) => ({
                id_service: toNum(s?.idService ?? s?.serviceId, -1) ?? -1,
                libelle: String(s?.libelle ?? ''),
                quantite: toNum(s?.quantite) ?? 1,
                prix_unitaire: toNum(s?.prixUnitaire ?? s?.prix_unitaire) ?? undefined,
                quantite_max: toNum(s?.quantiteMax ?? s?.quantite_max) ?? undefined
              }))
              : [];

            const documents = this.normalizeDocuments(d?.documents);
            const timeline = this.normalizeTimeline(d?.timeline);
            const rendezVous = this.normalizeRendezVous(d?.rendezVous ?? d?.rdv ?? null);

            const out: DemandeWithServices = {
              id_demande: id,
              code_type,
              type_libelle,
              code_statut,
              statut_libelle,
              date_demande,
              client,
              services,
              documents,
              timeline,
              rendezVous
            };
            return out;
          })
          .filter(Boolean) as DemandeWithServices[]
      )
    );
  }

  private buildOptions(options?: { silentError?: boolean }) {
    if (!options?.silentError) {
      return undefined;
    }
    return { headers: new HttpHeaders({ 'X-Skip-Error-Toast': '1' }) };
  }

  setStatut(id: number, newStatut: 'Brouillon' | 'En_attente' | 'Traitee' | 'Annulee') {
    return this.http.put<void>(`${this.apiBase}/demandes/${id}`, { codeStatut: newStatut });
  }

  updateDemande(
    id: number,
    payload: {
      codeType?: DemandeWithServices['code_type'];
      codeStatut?: DemandeWithServices['code_statut'];
      immatriculation?: string | null;
      client?: {
        telephone?: string | null;
        immatriculation?: string | null;
        adresseLigne1?: string | null;
        adresseLigne2?: string | null;
        adresseCodePostal?: string | null;
        adresseVille?: string | null;
      };
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
    if (payload.services) body['services'] = payload.services;
    if (payload.client) body['client'] = payload.client;

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

  uploadDocument(
    demandeId: number,
    file: File,
    options?: { visibleClient?: boolean; categorie?: string }
  ): Observable<DemandeDocumentDto> {
    const form = new FormData();
    form.append('file', file);
    if (options?.visibleClient !== undefined) {
      form.append('visibleClient', String(options.visibleClient));
    }
    if (options?.categorie) {
      form.append('categorie', options.categorie);
    }
    return this.http.post<DemandeDocumentDto>(`${this.apiBase}/demandes/${demandeId}/documents`, form, {
      headers: new HttpHeaders({ 'X-Skip-Error-Toast': '1' })
    });
  }

  deleteDocument(demandeId: number, documentId: number) {
    return this.http.delete<void>(`${this.apiBase}/demandes/${demandeId}/documents/${documentId}`);
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

  private toNumber(value: any, fallback: number | null = null) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  private normalizeDocuments(raw: any): DemandeDocumentDto[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw
      .map((doc: any) => {
        const id = this.toNumber(doc?.idDocument ?? doc?.id ?? doc?.documentId ?? null, null);
        const url = doc?.url ?? doc?.lien ?? doc?.link ?? doc?.downloadUrl;
        if (!url) {
          return null;
        }
        const size = this.toNumber(doc?.tailleKo ?? doc?.taille ?? doc?.sizeKo ?? null, null);
        return {
          idDocument: id ?? undefined,
          nom: String(doc?.nom ?? doc?.filename ?? 'Document'),
          url: String(url),
          tailleKo: size ?? undefined,
          visibleClient: doc?.visibleClient === false ? false : true,
          mimeType: doc?.mimeType ?? doc?.contentType ?? undefined,
          createdAt: doc?.createdAt ?? doc?.dateCreation ?? undefined
        } satisfies DemandeDocumentDto;
      })
      .filter(Boolean) as DemandeDocumentDto[];
  }

  private normalizeTimeline(raw: any): DemandeTimelineEntryDto[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw
      .map((entry: any) => {
        const document = entry?.document ? this.normalizeDocuments([entry.document])[0] : undefined;
        const rendezVous = this.normalizeRendezVous(entry?.rendezVous ?? entry?.rdv ?? null);
        return {
          id: this.toNumber(entry?.id ?? entry?.timelineId ?? null, null) ?? undefined,
          type: String(entry?.type ?? entry?.categorie ?? 'EVT'),
          source: entry?.source ?? undefined,
          createdAt: entry?.createdAt ?? entry?.dateCreation ?? undefined,
          createdBy: entry?.createdBy ?? undefined,
          createdByRole: entry?.createdByRole ?? undefined,
          visibleClient: entry?.visibleClient === false ? false : true,
          commentaire: entry?.commentaire ?? entry?.message ?? undefined,
          montantValide: this.toNumber(entry?.montantValide ?? entry?.montant ?? null, null) ?? undefined,
          statut: entry?.statut
            ? {
              codeStatut: entry.statut.codeStatut ?? entry.statut,
              libelle: entry.statut.libelle ?? undefined
            }
            : undefined,
          document,
          rendezVous
        } satisfies DemandeTimelineEntryDto;
      })
      .filter(Boolean) as DemandeTimelineEntryDto[];
  }

  private normalizeRendezVous(raw: any): RendezVousSummary | null {
    if (!raw) {
      return null;
    }
    const id = this.toNumber(raw?.idRdv ?? raw?.id ?? raw?.rendezVousId ?? null, null);
    const dateDebut = raw?.dateDebut ?? raw?.debut ?? null;
    const dateFin = raw?.dateFin ?? raw?.fin ?? null;
    if (!id || !dateDebut || !dateFin) {
      return null;
    }
    return {
      idRdv: id,
      codeStatut: raw?.codeStatut ?? raw?.statut?.codeStatut ?? 'Confirme',
      libelleStatut: raw?.libelleStatut ?? raw?.statut?.libelle ?? undefined,
      dateDebut,
      dateFin,
      commentaire: raw?.commentaire ?? undefined,
      creneau: raw?.creneau
        ? {
          idCreneau: this.toNumber(raw.creneau.idCreneau ?? raw.creneau.id ?? null, -1) ?? -1,
          dateDebut: raw.creneau.dateDebut ?? raw.creneau.debut,
          dateFin: raw.creneau.dateFin ?? raw.creneau.fin,
          statut: raw.creneau.statut
            ? {
              codeStatut: raw.creneau.statut.codeStatut ?? raw.creneau.statut,
              libelle: raw.creneau.statut.libelle ?? undefined
            }
            : undefined
        }
        : undefined
    } satisfies RendezVousSummary;
  }
}
