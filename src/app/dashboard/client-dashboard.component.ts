import { Component, Inject, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';
import {
  ClientDashboardService,
  ClientDocumentDto,
  DemandeDocumentDto,
  DemandeResponse,
  DemandeTimelineEntryDto,
  RendezVousSummary
} from '../services/client-dashboard.service';
import type { DemandeTypeCode } from '../modeles/demande.model';
import {
  RendezVousProposition,
  RendezVousPropositionStatut
} from '../modeles/rendezvous-proposition.model';
import { RendezVousPropositionsService } from '../services/rendezvous-propositions.service';
import { ToastService } from '../shared/toast/toast.service';
import { firstValueFrom, filter, forkJoin, of, Subscription, catchError } from 'rxjs';
import { LookupsService } from '../services/lookups.service';
import { ServicesComponent } from '../pages/services.component';
import { AccountComponent } from '../account/account.component/account.component';
import { PLATFORM_ID } from '@angular/core';

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
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    ServicesComponent,
    AccountComponent
  ],
  templateUrl: './client-dashboard.component.html',
  styleUrls: ['./client-dashboard.component.scss']
})
export class ClientDashboardComponent implements OnInit, OnDestroy {
  // ----- état existant -----
  loading = false;
  error = '';

  demandes = signal<DemandeResponse[]>([]);
  stats: ClientStatsDto | null = null;
  prochainsRdvs = signal<ProchainRdvDto[]>([]);

  submittingId: number | null = null;
  readonly activeSection = signal<'overview' | 'services' | 'account' | 'documents' | 'history'>('overview');
  documents = signal<ClientDocumentDto[]>([]);
  rdvProposals = signal<Record<number, RendezVousProposition[]>>({});
  rdvRequestComments = signal<Record<number, string>>({});
  isMobile = signal(false);
  // safe api base (no trailing slash)
  private api = environment.apiBaseUrl ? environment.apiBaseUrl.replace(/\/+$/, '') : '';
  private mobileQuery?: MediaQueryList;
  private mobileQueryListener?: (event: MediaQueryListEvent) => void;

  private readonly fallbackTypeOptions: Array<FilterOption<AnyTypeOrAll>> = [
    { value: 'Devis', label: 'Devis' },
    { value: 'Service', label: 'Service' },
    { value: 'RendezVous', label: 'Rendez-vous' }
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

    return (this.demandes() ?? [])
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

  readonly activeDemandes = computed<DemandeResponse[]>(() =>
    this.filteredDemandes().filter(d => !this.isArchived(d))
  );

  readonly latestActiveDemande = computed<DemandeResponse | null>(() => {
    const list = (this.demandes() ?? []).filter(d => !this.isArchived(d));
    if (!list.length) {
      return null;
    }
    return list.reduce((latest, current) => {
      if (!latest) {
        return current;
      }
      return this.demandeTimestamp(current) >= this.demandeTimestamp(latest) ? current : latest;
    }, list[0]);
  });

  readonly otherActiveDemandes = computed<DemandeResponse[]>(() => {
    const latest = this.latestActiveDemande();
    const list = this.activeDemandes();
    if (!latest?.idDemande) {
      return list;
    }
    return list.filter(d => d.idDemande !== latest.idDemande);
  });

  readonly archivedDemandes = computed<DemandeResponse[]>(() =>
    this.filteredDemandes().filter(d => this.isArchived(d))
  );

  readonly prochainsRdvsAVenir = computed<ProchainRdvDto[]>(() =>
    (this.prochainsRdvs() ?? []).filter(rdv =>
      this.isUpcomingRdv(rdv) && !this.isCancelledRdv(rdv.codeStatut, rdv.libelleStatut)
    )
  );

  constructor(
    private srv: ClientDashboardService,
    private http: HttpClient,
    private router: Router,
    private toast: ToastService,
    private lookups: LookupsService,
    private rdvPropositionsApi: RendezVousPropositionsService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  private navSub?: Subscription;

  ngOnInit() {
    this.setupMobileQuery();
    this.refresh({ delayMs: 200, retries: 2 });
    this.bootstrapLookups();
    this.navSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.refresh({ silent: true }));
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
    if (this.mobileQuery && this.mobileQueryListener) {
      this.mobileQuery.removeEventListener('change', this.mobileQueryListener);
    }
  }

  private setupMobileQuery() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.mobileQuery = window.matchMedia('(max-width: 640px)');
    this.isMobile.set(this.mobileQuery.matches);
    this.mobileQueryListener = event => this.isMobile.set(event.matches);
    this.mobileQuery.addEventListener('change', this.mobileQueryListener);
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
    let pending = 4;
    const finalize = () => {
      pending -= 1;
      if (pending <= 0) {
        this.loading = false;
      }
    };

    this.srv.getMyDemandes(httpOptions).subscribe({
      next: list => {
        const demandes = list ?? [];
        this.demandes.set(demandes);
        this.loadProposalsForDemandes(demandes);
        finalize();
      },
      error: err => {
        if (!silent) {
          this.error = err?.error?.message || err.message || 'Erreur de chargement des demandes';
        }
        if (retries > 0) {
          this.refresh({ silent: true, retries: retries - 1, delayMs: 600 });
        }
        finalize();
      }
    });

    this.srv.getMyStats(httpOptions).subscribe({
      next: s => {
        this.stats = s;
        finalize();
      },
      error: err => {
        if (!silent) {
          this.error ||= err?.error?.message || err.message || 'Erreur de chargement des statistiques';
        }
        finalize();
      }
    });

    this.srv.getProchainsRdv(httpOptions).subscribe({
      next: rdvs => {
        this.prochainsRdvs.set(rdvs ?? []);
        finalize();
      },
      error: err => {
        if (!silent) {
          this.error ||= err?.error?.message || err.message || 'Erreur de chargement des prochains RDV';
        }
        finalize();
      }
    });

    this.srv.getMyDocuments(httpOptions).subscribe({
      next: docs => {
        this.documents.set(docs ?? []);
        finalize();
      },
      error: err => {
        if (!silent) {
          this.error ||= err?.error?.message || err.message || 'Erreur de chargement des documents';
        }
        finalize();
      }
    });
  }

  private loadProposalsForDemandes(demandes: DemandeResponse[]) {
    if (!demandes?.length) {
      this.rdvProposals.set({});
      return;
    }
    const requests = demandes
      .map(demande => {
        const demandeId = Number(demande?.idDemande);
        if (!Number.isFinite(demandeId)) {
          return null;
        }
        return {
          demandeId,
          request: this.rdvPropositionsApi.listByDemande(demandeId).pipe(
            catchError(() => of([] as RendezVousProposition[]))
          )
        };
      })
      .filter((item): item is { demandeId: number; request: any } => item !== null);

    if (!requests.length) {
      this.rdvProposals.set({});
      return;
    }

    forkJoin(requests.map(item => item.request)).subscribe({
      next: results => {
        const map: Record<number, RendezVousProposition[]> = {};
        requests.forEach((item, index) => {
          map[item.demandeId] = results[index] ?? [];
        });
        this.rdvProposals.set(map);
      },
      error: () => {
        this.rdvProposals.set({});
      }
    });
  }

  /**
   * Ouvre un document dans un nouvel onglet (client & admin)
   */
  async openDocument(doc: DemandeDocumentDto, d?: DemandeResponse) {
    const popup = window.open('', '_blank');
    try {
      const demandeId = d?.idDemande;
      const documentId = doc.idDocument;
      if (!demandeId || !documentId) {
        popup?.close();
        this.toast.error('Erreur', 'Identifiants du document manquants.');
        return;
      }

      const res = await firstValueFrom(
        this.srv.downloadDocumentResponse(demandeId, documentId)
      );

      const blob = res.body as Blob;
      if (!blob) {
        popup?.close();
        this.toast.error('Erreur', 'Fichier vide.');
        return;
      }

      const blobUrl = URL.createObjectURL(blob);
      if (popup) {
        popup.location.href = blobUrl;
      } else {
        window.open(blobUrl, '_blank');
      }

      // Nettoyage après ouverture
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch (err: any) {
      popup?.close();
      const msg = err?.error?.message || err?.message || 'Téléchargement impossible';
      this.toast.error('Erreur', msg);
    }
  }

  async openClientDocument(entry: ClientDocumentDto) {
    const popup = window.open('', '_blank');
    try {
      const demandeId = entry?.demandeId;
      const documentId = entry?.document?.idDocument;
      if (!demandeId || !documentId) {
        popup?.close();
        this.toast.error('Erreur', 'Identifiants du document manquants.');
        return;
      }

      const res = await firstValueFrom(
        this.srv.downloadDocumentResponse(demandeId, documentId)
      );

      const blob = res.body as Blob;
      if (!blob) {
        popup?.close();
        this.toast.error('Erreur', 'Fichier vide.');
        return;
      }

      const blobUrl = URL.createObjectURL(blob);
      if (popup) {
        popup.location.href = blobUrl;
      } else {
        window.open(blobUrl, '_blank');
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch (err: any) {
      popup?.close();
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

  demandeTimestamp(d?: DemandeResponse): number {
    const value = this.demandeDate(d);
    return value ? new Date(value).getTime() : 0;
  }

  latestUpdateTimestamp(d?: DemandeResponse): number {
    const timeline = d?.timeline ?? [];
    const timelineTs = timeline
      .map(item => (item.createdAt ? new Date(item.createdAt).getTime() : 0))
      .filter(ts => Number.isFinite(ts));
    const latestTimeline = timelineTs.length ? Math.max(...timelineTs) : 0;
    return Math.max(latestTimeline, this.demandeTimestamp(d));
  }

  latestUpdateDate(d?: DemandeResponse): string | null {
    const ts = this.latestUpdateTimestamp(d);
    return ts > 0 ? new Date(ts).toISOString() : null;
  }

  isRecentlyUpdated(d?: DemandeResponse): boolean {
    const ts = this.latestUpdateTimestamp(d);
    if (!ts) {
      return false;
    }
    const fortyEightHours = 48 * 60 * 60 * 1000;
    return Date.now() - ts <= fortyEightHours;
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

  canDownloadIcs(rdv?: ProchainRdvDto | RendezVousSummary | null): boolean {
    if (!rdv) {
      return false;
    }
    return !this.isCancelledRdv(rdv.codeStatut, rdv.libelleStatut) && this.isUpcomingRdv(rdv);
  }

  private isCancelledRdv(statut?: string | null, libelle?: string | null): boolean {
    const merged = `${statut ?? ''} ${libelle ?? ''}`.toLowerCase();
    return merged.includes('annul');
  }

  isCancelledDemande(d?: DemandeResponse | null): boolean {
    const statut = d?.statutDemande?.codeStatut;
    const libelle = d?.statutDemande?.libelle;
    return this.isCancelledRdv(statut, libelle);
  }

  private isUpcomingRdv(rdv: { dateDebut?: string; dateFin?: string }): boolean {
    const dateFin = rdv.dateFin ? new Date(rdv.dateFin).getTime() : NaN;
    const dateDebut = rdv.dateDebut ? new Date(rdv.dateDebut).getTime() : NaN;
    const compareDate = Number.isFinite(dateFin) ? dateFin : dateDebut;
    if (!Number.isFinite(compareDate)) {
      return false;
    }
    return compareDate > Date.now();
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

  hasDevis(d?: DemandeResponse): boolean {
    return Boolean(d?.devis?.idDevis);
  }

  canRequestRendezVous(d?: DemandeResponse): boolean {
    if (!d) return false;
    if (!this.hasDevis(d)) return false;
    if (this.isArchived(d)) return false;
    if (this.rendezVousInfo(d)) return false;
    const statut = d.statutDemande?.codeStatut;
    return statut !== 'Annulee' && statut !== 'Traitee';
  }

  updateRdvRequestComment(demandeId: number, value: string) {
    this.rdvRequestComments.update(current => ({
      ...current,
      [demandeId]: value
    }));
  }

  async requestRendezVous(d: DemandeResponse) {
    if (!d?.idDemande) return;
    if (!this.canRequestRendezVous(d)) {
      this.toast.info('Impossible de demander un rendez-vous pour cette demande.');
      return;
    }
    const comment = (this.rdvRequestComments()[d.idDemande] || '').trim();
    try {
      await firstValueFrom(
        this.http.post(
          `${this.api}/demandes/${d.idDemande}/rendezvous-request`,
          { commentaire: comment || null }
        )
      );
      this.toast.success('Votre demande de rendez-vous a bien été transmise.');
      this.updateRdvRequestComment(d.idDemande, '');
      this.refresh({ silent: true, delayMs: 200 });
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'Impossible de demander un rendez-vous.';
      this.toast.error('Erreur', msg);
    }
  }

  async archiveDemande(d: DemandeResponse) {
    if (!d?.idDemande) return;
    if (this.isArchived(d)) return;
    if (!confirm('Archiver ce devis ? Il ne sera plus actif et ne pourra pas être planifié.')) {
      return;
    }
    try {
      await firstValueFrom(this.http.patch(`${this.api}/demandes/${d.idDemande}/archive`, {}));
      this.toast.success('Demande archivée.');
      this.refresh({ silent: true, delayMs: 200 });
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'Archivage impossible.';
      this.toast.error('Erreur', msg);
    }
  }

  proposalsFor(d?: DemandeResponse): RendezVousProposition[] {
    if (!d?.idDemande) return [];
    return this.rdvProposals()[Number(d.idDemande)] ?? [];
  }

  proposalStatusLabel(statut: RendezVousPropositionStatut) {
    switch (statut) {
      case 'PROPOSE':
        return 'Proposé';
      case 'ACCEPTE':
        return 'Accepté';
      case 'REFUSE':
        return 'Refusé';
      case 'EXPIRE':
        return 'Expiré';
      default:
        return statut;
    }
  }

  acceptProposal(demandeId: number, propositionId: number) {
    this.rdvPropositionsApi.accept(demandeId, propositionId).subscribe({
      next: () => this.refresh({ silent: true, delayMs: 200 }),
      error: err => {
        const msg = err?.error?.message || 'Impossible de valider ce créneau.';
        this.toast.error('Erreur', msg);
      }
    });
  }

  declineProposal(demandeId: number, propositionId: number) {
    this.rdvPropositionsApi.decline(demandeId, propositionId).subscribe({
      next: () => this.refresh({ silent: true, delayMs: 200 }),
      error: err => {
        const msg = err?.error?.message || 'Impossible de refuser ce créneau.';
        this.toast.error('Erreur', msg);
      }
    });
  }

  isArchived(d?: DemandeResponse): boolean {
    const status = d?.statutDemande?.codeStatut;
    if (status === 'Traitee' || this.isCancelledDemande(d)) {
      return true;
    }
    const rdvDate = d?.rendezVous?.dateDebut ? new Date(d.rendezVous.dateDebut) : null;
    if (rdvDate && rdvDate.getTime() <= Date.now()) {
      return true;
    }
    return false;
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

  showOverview() {
    this.activeSection.set('overview');
  }

  showServices() {
    this.activeSection.set('services');
  }

  showAccount() {
    this.activeSection.set('account');
  }

  showDocuments() {
    this.activeSection.set('documents');
  }

  showHistory() {
    this.activeSection.set('history');
  }

}
