import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';
import { ClientDashboardService, DemandeResponse } from '../services/client-dashboard.service';
import type { DemandeTypeCode } from '../modeles/demande.model';
import { ToastService } from '../shared/toast/toast.service';
import { firstValueFrom } from 'rxjs';

type CodeStatut =
  | 'Brouillon' | 'En_attente' | 'Traitee' | 'Annulee'
  | 'Confirme' | 'Reporte' | 'Annule';

export interface ClientStatsDto {
  enAttente: number;
  traitees: number;
  annulees: number;
  rdvAvenir: number;
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
  private api = environment.apiBaseUrl;

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
            ...(Array.isArray(d?.services) ? d.services.map(s => s.libelle) : [])
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
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.refresh();
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

    const httpOptions = { silentError: silent } as const;

    this.srv.getMyDemandes(httpOptions).subscribe({
      next: list => {
        this.demandes = list ?? [];
      },
      error: err => {
        if (!silent) {
          this.error = err?.error?.message || err.message || 'Erreur de chargement des demandes';
        } else if (retries > 0) {
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
        if (err.status !== 204 && !silent) {
          this.error ||= err?.error?.message || err.message || 'Erreur de chargement du prochain RDV';
        }
        this.loading = false;
      },
      complete: () => { this.loading = false; }
    });
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
        const blob = new Blob([res.body!], { type: 'text/calendar;charset=UTF-8' });
        let filename = 'prochain-rdv.ics';
        const cd = res.headers.get('Content-Disposition');
        const m = cd && /filename="?([^"]+)"?/i.exec(cd);
        if (m?.[1]) filename = m[1];

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.toast.info('Fichier ICS téléchargé.');
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
