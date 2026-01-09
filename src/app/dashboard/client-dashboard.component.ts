import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';
import {
  ClientDashboardService,
  DemandeDocumentDto,
  DemandeResponse,
  DemandeTimelineEntryDto,
  RendezVousSummary
} from '../services/client-dashboard.service';
import type { DemandeTypeCode } from '../modeles/demande.model';
import { ToastService } from '../shared/toast/toast.service';
import { firstValueFrom } from 'rxjs';
import { LookupsService } from '../services/lookups.service';

type CodeStatut =
  | 'Brouillon' | 'En_attente' | 'Traitee' | 'Annulee'
  | 'Confirme' | 'Reporte' | 'Annule';

export interface ClientStatsDto {
  enAttente: number;
  traitees: number;
  annulees: number;
  rdvAvenir: number;
  demandesLibres: number;
  demandesService: number;
  demandesDevis: number;
  rdvLies: number;
  rdvNonLies: number;
}

export interface ProchainRdvDto {
  idRdv: number;
  codeStatut: CodeStatut | string;
  libelleStatut?: string;
  dateDebut: string;
  dateFin: string;
}

type AnyTypeOrAll = 'ALL' | DemandeTypeCode;
type AnyStatutOrAll =
  | 'ALL'
  | 'Brouillon' | 'En_attente' | 'Traitee' | 'Annulee'
  | 'Confirme' | 'Reporte' | 'Annule';

interface RefreshOptions {
  silent?: boolean;
  delayMs?: number;
  retries?: number;
}

interface FilterState {
  q: string;
  type: AnyTypeOrAll;
  statut: AnyStatutOrAll;
  dateFrom: string | null; // ISO yyyy-MM-dd
  dateTo: string | null;   // ISO yyyy-MM-dd
}

interface FilterOption<T extends string> {
  value: T;
  label: string;
}

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, FormsModule],
  templateUrl: './client-dashboard.component.html',
  styleUrls: ['./client-dashboard.component.scss']
})
export class ClientDashboardComponent implements OnInit {
  // ----- état existant -----
  loading = false;
  error = '';

  demandes: DemandeResponse[] = [];
  stats: ClientStatsDto | null = null;
  prochainRdv: ProchainRdvDto | null = null;

  submittingId: number | null = null;
  // safe api base (no trailing slash)
  private api = environment.apiBaseUrl ? environment.apiBaseUrl.replace(/\/+$/, '') : '';

  private readonly fallbackTypeOptions: Array<FilterOption<AnyTypeOrAll>> = [
    { value: 'Devis', label: 'Devis' },
    { value: 'Service', label: 'Service' },
    { value: 'Libre', label: 'Rendez-vous libre' }
  ];

  private readonly fallbackStatutOptions: Array<FilterOption<AnyStatutOrAll>> = [
    { value: 'Brouillon', label: 'Brouillon' },
    { value: 'En_attente', label: 'En attente' },
    { value: 'Traitee', label: 'Traitée' },
    { value: 'Annulee', label: 'Annulée' }
  ];

  private readonly fallbackRdvStatutOptions: Array<FilterOption<AnyStatutOrAll>> = [
    { value: 'Confirme', label: 'Confirmé (RDV)' },
    { value: 'Reporte', label: 'Reporté (RDV)' },
    { value: 'Annule', label: 'Annulé (RDV)' }
  ];

  readonly typeOptions = signal<Array<FilterOption<AnyTypeOrAll>>>([
    { value: 'ALL', label: 'Tous' },
    ...this.fallbackTypeOptions
  ]);

  readonly statutOptions = signal<Array<FilterOption<AnyStatutOrAll>>>([
    { value: 'ALL', label: 'Tous' },
    ...this.fallbackStatutOptions,
    ...this.fallbackRdvStatutOptions
  ]);

  // ----- filtres -----
  readonly filters = signal<FilterState>({
    q: '',
    type: 'ALL',
    statut: 'ALL',
    dateFrom: null,
    dateTo: null
  });

  // calcul: liste filtrée + tri DESC (récent → ancien)
  readonly filteredDemandes = computed<DemandeResponse[]>(() => {
    const f = this.filters();
    const q = f.q.trim().toLowerCase();

    const from = f.dateFrom ? new Date(f.dateFrom + 'T00:00:00').getTime() : null;
    const to   = f.dateTo   ? new Date(f.dateTo   + 'T23:59:59').getTime() : null;

    return (this.demandes ?? [])
      .filter(d => {
        // type
        if (f.type !== 'ALL') {
          const t = d?.typeDemande?.codeType as DemandeTypeCode | undefined;
          if (t !== f.type) return false;
        }
        // statut
        if (f.statut !== 'ALL') {
          const s = d?.statutDemande?.codeStatut as AnyStatutOrAll | undefined;
          if (s !== f.statut) return false;
        }
        // dates (sur dateDemande / dateSoumission)
        const dateValue = this.demandeDate(d);
        const ts = dateValue ? new Date(dateValue).getTime() : 0;
        if (from !== null && ts < from) return false;
        if (to   !== null && ts > to)   return false;

        // recherche texte: libellé service, id, type, client, email
        if (q.length) {
          const hay = [
            String(d?.idDemande ?? ''),
            d?.typeDemande?.libelle, d?.typeDemande?.codeType,
            d?.statutDemande?.libelle, d?.statutDemande?.codeStatut,
            d?.client?.nom, d?.client?.prenom, d?.client?.email, d?.client?.immatriculation,
            d?.client?.vehiculeMarque, d?.client?.vehiculeModele,
            ...(Array.isArray(d?.services) ? d.services.map(s => s.libelle) : []),
            ...this.visibleDocuments(d).map(doc => doc.nomFichier)
          ].filter(Boolean).join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const da = this.demandeDate(a);
        const db = this.demandeDate(b);
        const tsA = da ? new Date(da).getTime() : 0;
        const tsB = db ? new Date(db).getTime() : 0;
        return tsB - tsA;
      });
  });

  constructor(
    private srv: ClientDashboardService,
    private http: HttpClient,
    private router: Router,
    private toast: ToastService,
    private lookups: LookupsService
  ) {}

  ngOnInit() {
    this.refresh();
    this.bootstrapLookups();
  }

  private bootstrapLookups() {
    this.lookups.getTypeDemandes().subscribe({
      next: rows => {
        const mapped = Array.isArray(rows)
          ? rows.map(row => ({
            value: (row.codeType as AnyTypeOrAll) ?? 'Devis',
            label: row.libelle || row.codeType
          }))
          : [];
        const combined = [...this.fallbackTypeOptions, ...mapped];
        const dedup = this.deduplicateOptions(combined, 'ALL');
        this.typeOptions.set([
          { value: 'ALL', label: 'Tous' },
          ...dedup
        ]);
      },
      error: () => {
        // fallback already set
      }
    });

    this.lookups.getStatutDemandes().subscribe({
      next: rows => {
        const mapped = Array.isArray(rows)
          ? rows.map(row => ({
            value: (row.codeStatut as AnyStatutOrAll) ?? 'En_attente',
            label: row.libelle || row.codeStatut
          }))
          : [];
        const combined = [...this.fallbackStatutOptions, ...mapped];
        const dedup = this.deduplicateOptions(combined, 'ALL');
        const withRdv = this.deduplicateOptions([...dedup, ...this.fallbackRdvStatutOptions], 'ALL');
        this.statutOptions.set([
          { value: 'ALL', label: 'Tous' },
          ...withRdv
        ]);
      },
      error: () => {
        // fallback already set
      }
    });
  }

  private deduplicateOptions<T extends string>(items: Array<FilterOption<T>>, skipValue: string) {
    const seen = new Set<string>([skipValue]);
    const out: Array<FilterOption<T>> = [];
    for (const item of items) {
      if (!item.value || seen.has(item.value)) continue;
      seen.add(item.value);
      out.push(item);
    }
    return out;
  }

  // ===========================
  // Chargements
  // ===========================
  refresh(options: RefreshOptions = {}) {
    const { silent = false, delayMs = 0, retries = 0 } = options;
    if (delayMs > 0) {
      setTimeout(() => this.refresh({ silent, retries }), delayMs);
      return;
    }

    this.loading = true;
    if (!silent) {
      this.error = '';
    }

    const httpOptions = { silentError: true } as const;

    this.srv.getMyDemandes(httpOptions).subscribe({
      next: list => {
        this.demandes = list ?? [];
      },
      error: err => {
        if (!silent) {
          this.error = err?.error?.message || err.message || 'Erreur de chargement des demandes';
        }
        if (retries > 0) {
          this.refresh({ silent: true, retries: retries - 1, delayMs: 600 });
        }
      }
    });

    this.srv.getMyStats(httpOptions).subscribe({
      next: s => { this.stats = s; },
      error: err => {
        if (!silent) {
          this.error ||= err?.error?.message || err.message || 'Erreur de chargement des statistiques';
        }
      }
    });

    this.srv.getProchainRdv(httpOptions).subscribe({
      next: rdv => { this.prochainRdv = rdv || null; },
      error: err => {
        if (err.status !== 204 && err.status !== 404 && !silent) {
          this.error ||= err?.error?.message || err.message || 'Erreur de chargement du prochain RDV';
        }
        this.loading = false;
      },
      complete: () => { this.loading = false; }
    });
  }

  /**
   * Ouvre un document dans un nouvel onglet (client & admin)
   */
  async openDocument(doc: DemandeDocumentDto, d?: DemandeResponse) {
    try {
      const demandeId = d?.idDemande;
      const documentId = doc.idDocument;
      if (!demandeId || !documentId) {
        this.toast.error('Erreur', 'Identifiants du document manquants.');
        return;
      }

      const res = await firstValueFrom(
        this.srv.downloadDocumentResponse(demandeId, documentId)
      );

      const blob = res.body as Blob;
      if (!blob) {
        this.toast.error('Erreur', 'Fichier vide.');
        return;
      }

      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');

      // Nettoyage après ouverture
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'Téléchargement impossible';
      this.toast.error('Erreur', msg);
    }
  }


  // ===========================
  // Helpers & UI
  // ===========================
  isDraft(d?: DemandeResponse): boolean {
    return (d?.statutDemande?.codeStatut || 'Brouillon') === 'Brouillon';
  }

  demandeDate(d?: DemandeResponse): string | null {
    if (!d) {
      return null;
    }
    return d.dateDemande || d.dateSoumission || null;
  }

  totalDemande(d: DemandeResponse): number {
    if (!d?.services?.length) return 0;
    return d.services.reduce((sum, s) => sum + (s.prixUnitaire || 0) * (s.quantite || 0), 0);
  }

  badgeClassForDemande(code?: string): string {
    switch (code) {
      case 'Traitee':   return 'badge success';
      case 'Annulee':   return 'badge danger';
      case 'En_attente':return 'badge warning';
      case 'Brouillon': return 'badge info';
      default:          return 'badge';
    }
  }

  badgeClassForRdv(code?: string): string {
    switch (code) {
      case 'Confirme': return 'badge success';
      case 'Reporte':  return 'badge warning';
      case 'Annule':   return 'badge danger';
      default: return 'badge';
    }
  }

  visibleDocuments(d?: DemandeResponse): DemandeDocumentDto[] {
    return (d?.documents ?? []).filter(doc => doc.visibleClient !== false && !!doc.urlPrivate);
  }

  /**
   * Correction : doc.tailleOctets est en octets.
   * - < 1024 => affichage en octets
   * - >= 1024 && < 1024*1024 => Ko
   * - >= 1024*1024 => Mo (1 décimale)
   */
  documentSize(doc: DemandeDocumentDto): string | null {
    if (!doc) return null;

    const bytes = Number(doc?.tailleOctets ?? 0);
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return null;
    }

    if (bytes >= 1024 * 1024) {
      const mo = bytes / (1024 * 1024);
      return `${mo.toFixed(1)} Mo`;
    }

    if (bytes >= 1024) {
      const ko = bytes / 1024;
      return `${ko.toFixed(0)} Ko`;
    }

    return `${bytes} o`;
  }

  visibleTimeline(d?: DemandeResponse): DemandeTimelineEntryDto[] {
    return (d?.timeline ?? []).filter(item => item.visibleClient !== false);
  }

  timelineLabel(entry: DemandeTimelineEntryDto): string {
    if (entry.commentaire) {
      return entry.commentaire;
    }
    if (entry.statut?.libelle || entry.statut?.codeStatut) {
      return `Statut mis à jour : ${entry.statut.libelle || entry.statut.codeStatut}`;
    }
    if (entry.document?.nomFichier) {
      return `Document ajouté : ${entry.document.nomFichier}`;
    }
    if (entry.rendezVous?.dateDebut) {
      return 'Rendez-vous mis à jour';
    }
    if (entry.montantValide != null) {
      const amount = Number(entry.montantValide);
      if (Number.isFinite(amount)) {
        return `Montant validé : ${amount.toFixed(2)} €`;
      }
    }
    return entry.type;
  }

  timelineAuthor(entry: DemandeTimelineEntryDto): string | null {
    if (entry.createdBy) {
      return entry.createdBy;
    }
    if (entry.createdByRole) {
      return entry.createdByRole === 'ROLE_ADMIN' ? 'Administrateur' : entry.createdByRole;
    }
    return null;
  }

  rendezVousInfo(d?: DemandeResponse): RendezVousSummary | null {
    if (!d) return null;
    if (d.rendezVous) {
      return d.rendezVous;
    }
    const entry = this.visibleTimeline(d).find(item => !!item.rendezVous);
    return entry?.rendezVous ?? null;
  }

  clientVehicle(d?: DemandeResponse): string | null {
    const marque = d?.client?.vehiculeMarque;
    const modele = d?.client?.vehiculeModele;
    if (!marque && !modele) {
      return null;
    }
    return [marque, modele].filter(Boolean).join(' ');
  }

  clientImmatriculation(d?: DemandeResponse): string | null {
    return d?.client?.immatriculation || null;
  }

  async downloadRdvIcs(rdvId: number) {
    try {
      const res = await firstValueFrom(this.srv.getRendezVousIcs(rdvId));
      this.handleIcsResponse(res, `rdv-${rdvId}.ics`);
    } catch (err: any) {
      const msg = err?.error?.message || err.message || 'Téléchargement ICS impossible';
      this.toast.error('Erreur', msg);
    }
  }

  // ===========================
  // Actions
  // ===========================
  async submitDraft(d: DemandeResponse) {
    if (!d?.idDemande) return;
    this.submittingId = d.idDemande;
    try {
      await firstValueFrom(this.http.patch<void>(`${this.api}/demandes/${d.idDemande}/submit`, {}));
      this.toast.success('Demande envoyée avec succès !');
      this.refresh({ silent: true, delayMs: 400, retries: 2 });
    } catch (e: any) {
      const msg = e?.error?.message || e?.message || 'Validation impossible';
      this.toast.error('Échec de l’envoi', msg);
    } finally {
      this.submittingId = null;
    }
  }

  continueDraft() {
    this.router.navigate(['/services']);
  }

  downloadIcs() {
    this.srv.getProchainRdvIcs().subscribe({
      next: (res) => {
        this.handleIcsResponse(res, 'prochain-rdv.ics');
      },
      error: (err) => {
        if (err.status === 204) {
          this.toast.info('Aucun rendez-vous à venir.');
        } else {
          const msg = err?.error?.message || err.message || 'Téléchargement ICS impossible';
          this.toast.error('Erreur', msg);
        }
      }
    });
  }

  private handleIcsResponse(res: any, fallbackName: string) {
    if (!res?.body) {
      this.toast.error('Erreur', 'Fichier ICS vide');
      return;
    }

    const blob = new Blob([res.body], { type: 'text/calendar;charset=UTF-8' });
    let filename = fallbackName;
    // more robust header reading
    try {
      const cd = res.headers?.get ? res.headers.get('Content-Disposition') : (res.headers && (res.headers['content-disposition'] || res.headers['Content-Disposition']));
      const m = cd && /filename="?([^"]+)"?/i.exec(cd);
      if (m?.[1]) filename = m[1];
    } catch (e) {
      // ignore - fallback will be used
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    this.toast.info('Fichier ICS téléchargé.');
  }

  // ===========================
  // Filtres
  // ===========================
  setQ(v: string)       { this.filters.update(f => ({ ...f, q: v })); }
  setType(v: AnyTypeOrAll)   { this.filters.update(f => ({ ...f, type: v })); }
  setStatut(v: AnyStatutOrAll){ this.filters.update(f => ({ ...f, statut: v })); }
  setFrom(v: string)    { this.filters.update(f => ({ ...f, dateFrom: v || null })); }
  setTo(v: string)      { this.filters.update(f => ({ ...f, dateTo: v || null })); }

  clearFilters() {
    this.filters.set({ q: '', type: 'ALL', statut: 'ALL', dateFrom: null, dateTo: null });
  }

}
