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
  private apiBase: string = environment.apiBaseUrl.replace(/\/$/, '');

  // ---------- ADMIN : compatibilité historique ----------
  getAll(options?: { silentError?: boolean }): Observable<DemandeWithServices[]> {
    const httpOptions = this.buildOptions(options);
    return this.http.get<any[]>(`${this.apiBase}/demandes`, httpOptions).pipe(
      map(rows => Array.isArray(rows) ? rows : []),
      map(rows =>
        rows
          .map((d: any) => this.normalizeDemande(d))
          .filter(Boolean) as DemandeWithServices[]
      )
    );
  }

  getById(id: number, options?: { silentError?: boolean }): Observable<DemandeWithServices | null> {
    const httpOptions = this.buildOptions(options);
    return this.http.get<any>(`${this.apiBase}/demandes/${id}`, httpOptions).pipe(
      map(d => this.normalizeDemande(d))
    );
  }

  private buildOptions(options?: { silentError?: boolean }) {
    if (!options?.silentError) {
      return undefined;
    }
    return { headers: new HttpHeaders({ 'X-Skip-Error-Toast': '1' }) };
  }

  private normalizeDemande(d: any): DemandeWithServices | null {
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

    const type_libelle =
      typeof d?.typeDemande?.libelle === 'string' ? d.typeDemande.libelle : undefined;
    const statut_libelle =
      typeof d?.statutDemande?.libelle === 'string' ? d.statutDemande.libelle : undefined;

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
        vehiculeModele: normalizeString(c.vehiculeModele ?? c.modeleVehicule),
        vehiculeEnergie: normalizeString(c.vehiculeEnergie)
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

    // <-- IMPORTANT : on passe l'id de la demande pour construire urlPublic si besoin -->
    const documents = this.normalizeDocuments(d?.documents);
    const timeline = this.normalizeTimeline(d?.timeline);
    const rendezVous = this.normalizeRendezVous(d?.rendezVous ?? d?.rdv ?? null);
    const devisId = toNum(d?.devis?.idDevis);
    const devis = devisId != null
      ? {
        id_devis: devisId,
        montant_total: toNum(d?.devis?.montantTotal ?? d?.devis?.montant_total),
        rendezVousId: toNum(d?.devis?.rendezVousId)
      }
      : null;

    return {
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
      rendezVous,
      devis
    };
  }

  updateDemande(
    id: number,
    payload: {
      codeType?: DemandeWithServices['code_type'];
      immatriculation?: string | null;
      vehiculeMarque?: string | null;
      vehiculeModele?: string | null;
      vehiculeEnergie?: string | null;
      telephone?: string | null;
      adresseLigne1?: string | null;
      adresseLigne2?: string | null;
      adresseCodePostal?: string | null;
      adresseVille?: string | null;
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
    if ('immatriculation' in payload) body['immatriculation'] = payload.immatriculation;
    if ('vehiculeMarque' in payload) body['vehiculeMarque'] = payload.vehiculeMarque;
    if ('vehiculeModele' in payload) body['vehiculeModele'] = payload.vehiculeModele;
    if ('vehiculeEnergie' in payload) body['vehiculeEnergie'] = payload.vehiculeEnergie;
    if ('telephone' in payload) body['telephone'] = payload.telephone;
    if ('adresseLigne1' in payload) body['adresseLigne1'] = payload.adresseLigne1;
    if ('adresseLigne2' in payload) body['adresseLigne2'] = payload.adresseLigne2;
    if ('adresseCodePostal' in payload) body['adresseCodePostal'] = payload.adresseCodePostal;
    if ('adresseVille' in payload) body['adresseVille'] = payload.adresseVille;
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

  /**
   * Upload d'un document pour une demande.
   * Le backend renvoie déjà un DemandeDocumentDto aligné (nomFichier, urlPrivate, ...).
   * Ici on mappe la réponse pour fournir urlPublic utilisable côté frontend (endpoint sécurisé).
   */
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
    return this.http.post<any>(
      `${this.apiBase}/demandes/${demandeId}/documents`,
      form,
      { headers: new HttpHeaders({ 'X-Skip-Error-Toast': '1' }) }
    ).pipe(
      map((created: any) => {
        // map backend response to frontend DTO, building a usable urlPublic
        const dto = this.toDocumentDto(created);
        if (!dto) {
          // fallback: return raw created cast (avoid returning null)
          return (created as unknown) as DemandeDocumentDto;
        }
        return dto;
      })
    );
  }

  deleteDocument(demandeId: number, documentId: number) {
    return this.http.delete<void>(`${this.apiBase}/demandes/${demandeId}/documents/${documentId}`);
  }

  downloadDocumentResponse(demandeId: number, documentId: number) {
    const url = `${this.apiBase}/demandes/${demandeId}/documents/${documentId}`;
    return this.http.get(url, {
      observe: 'response',
      responseType: 'blob'
    });
  }

  validatePrice(demandeId: number, montantValide: number, commentaire?: string | null) {
    return this.http.post<void>(
      `${this.apiBase}/demandes/${demandeId}/timeline/validation-prix`,
      {
        type: 'MONTANT',
        montantValide,
        commentaire: commentaire ?? null
      },
      { headers: new HttpHeaders({ 'X-Skip-Error-Toast': '1' }) }
    );
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

  // -------------------------------------------------------------------
  // DOCUMENTS
  // -------------------------------------------------------------------

  /**
   * Normalize documents array. demandeId is optional but used to construct secure access URL
   */
  private normalizeDocuments(raw: any): DemandeDocumentDto[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .map((doc: any) => this.toDocumentDto(doc))
      .filter(Boolean) as DemandeDocumentDto[];
  }

  private toDocumentDto(doc: any): DemandeDocumentDto | null {
    if (!doc) {
      return null;
    }

    const id = this.toNumber(doc?.idDocument ?? doc?.id ?? doc?.documentId ?? doc?.id_document ?? null, null);
    const urlPrivate = this.extractDocumentUrl(doc);
    const tailleOctets = this.computeDocumentSizeOctets(doc);
    const rawName = doc?.nomFichier ?? doc?.nom_fichier ?? doc?.nom ?? doc?.filename ?? doc?.titre;
    const nomFichier = typeof rawName === 'string' && rawName.trim().length > 0 ? rawName.trim() : 'Document';

    const visibleClientField = doc?.visibleClient ?? doc?.visible_client;
    const visibleClient = visibleClientField === false || visibleClientField === 'false'
      ? false
      : true;

    return {
      idDocument: id ?? undefined,
      nomFichier,
      urlPrivate: urlPrivate ?? null,
      tailleOctets: tailleOctets ?? undefined,
      visibleClient,
      typeContenu: doc?.typeContenu ?? doc?.type_contenu ?? doc?.contentType ?? doc?.mimeType ?? undefined,
      creeLe: doc?.creeLe ?? doc?.cree_le ?? doc?.createdAt ?? doc?.dateCreation ?? doc?.created_at ?? undefined,
      creePar: doc?.creePar ?? doc?.createdBy ?? undefined,
      creeParRole: doc?.creeParRole ?? doc?.createdByRole ?? undefined
    } satisfies DemandeDocumentDto;
  }

  private extractDocumentUrl(doc: any): string | null {
    const candidates = [
      doc?.url,
      doc?.lien,
      doc?.link,
      doc?.downloadUrl,
      doc?.urlPublic,
      doc?.url_public,
      doc?.urlPublique
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (trimmed.length > 0) {
          return trimmed;
        }
      }
    }

    const path = typeof doc?.path === 'string'
      ? doc.path
      : typeof doc?.chemin === 'string'
        ? doc.chemin
        : null;
    if (path) {
      return this.joinUrl(this.apiBase, path);
    }

    return null;
  }

  private computeDocumentSizeOctets(doc: any): number | null {
    const bytes = this.toNumber(
      doc?.tailleOctets ?? doc?.taille_octets ?? doc?.tailleOctet ?? doc?.taille_bytes ?? null,
      null
    );
    if (bytes != null) {
      return bytes;
    }

    const kiloBytes = this.toNumber(
      doc?.tailleKo ?? doc?.taille_ko ?? doc?.taille ?? doc?.sizeKo ?? doc?.size_ko ?? null,
      null
    );
    if (kiloBytes != null) {
      return Math.round(kiloBytes * 1024);
    }

    return null;
  }

  private joinUrl(base: string, path: string): string {
    if (!path) {
      return base;
    }
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
  }

  private normalizeTimeline(raw: any): DemandeTimelineEntryDto[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw
      .map((entry: any) => {
        // normalise le document : trouver le premier élément non-null (ou undefined)
        const document = entry?.document
          ? this.normalizeDocuments([entry.document]).find(d => !!d)
          : undefined;

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
          document,    // DemandeDocumentDto | undefined (pas de null)
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
    const statut = raw?.statut ?? raw?.statutRendezVous ?? raw?.statut_rendez_vous ?? null;
    const codeStatut =
      raw?.codeStatut ??
      raw?.statutCode ??
      raw?.rendezVousStatutCode ??
      statut?.codeStatut ??
      statut?.code ??
      statut ??
      'Confirme';
    const libelleStatut =
      raw?.libelleStatut ??
      raw?.rendezVousStatutLibelle ??
      statut?.libelle ??
      undefined;

    const creneauId = this.toNumber(
      raw?.creneauId ?? raw?.idCreneau ?? raw?.creneau?.idCreneau ?? raw?.creneau?.id ?? null,
      null
    );

    return {
      idRdv: id,
      codeStatut,
      libelleStatut,
      dateDebut,
      dateFin,
      commentaire: raw?.commentaire ?? undefined,
      creneau: creneauId
        ? {
          idCreneau: creneauId,
          dateDebut: raw?.creneau?.dateDebut ?? raw?.creneau?.debut ?? dateDebut,
          dateFin: raw?.creneau?.dateFin ?? raw?.creneau?.fin ?? dateFin,
          statut: raw?.creneau?.statut
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
