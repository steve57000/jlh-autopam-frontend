import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { DemandeWithServices } from '../modeles/demande.model';
import { DemandesServiceService } from '../services/demandes-services.service';
import {
  AdminDashboardAnalytics,
  AdminDashboardStats,
  AdminDashboardStatsService,
  AdminYearlyStats
} from '../services/admin-dashboard-stats.service';
import { ServicesService } from '../services/services.service';
import { ServiceDto } from '../modeles/service.model';
import { filter, Subscription } from 'rxjs';

type ChartView =
  | 'histogram'
  | 'histogram-side-by-side'
  | 'bar'
  | 'bar-grouped'
  | 'bar-stacked'
  | 'pareto'
  | 'mosaic'
  | 'treemap'
  | 'boxplot';

type ChartViewSection = 'types' | 'services' | 'revenue' | 'history';
type DemandeType = DemandeWithServices['code_type'];

const CHART_VIEW_OPTIONS: Array<{ value: ChartView; label: string }> = [
  { value: 'histogram', label: 'Histogrammes' },
  { value: 'histogram-side-by-side', label: 'Histogrammes côte à côte' },
  { value: 'bar', label: 'Diagrammes en barres' },
  { value: 'bar-grouped', label: 'Diagrammes en barres groupées' },
  { value: 'bar-stacked', label: 'Diagrammes en barres empilées' },
  { value: 'pareto', label: 'Diagrammes de Pareto' },
  { value: 'mosaic', label: 'Graphiques en mosaïque' },
  { value: 'treemap', label: 'Treemaps' },
  { value: 'boxplot', label: 'Boîtes à moustaches' }
];

interface DashboardStats extends AdminDashboardAnalytics {
  budget: {
    total: number;
    averagePerDemande: number;
    averagePerClient: number;
  };
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink]
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private readonly demandesApi = inject(DemandesServiceService);
  private readonly adminStatsApi = inject(AdminDashboardStatsService);
  private readonly servicesApi = inject(ServicesService);
  private readonly router = inject(Router);
  private navSub?: Subscription;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly demandes = signal<DemandeWithServices[]>([]);
  readonly yearlyStats = signal<AdminYearlyStats[]>([]);
  readonly statsMeta = signal<AdminDashboardStats | null>(null);
  readonly analytics = signal<AdminDashboardAnalytics | null>(null);
  readonly servicesCatalog = signal<ServiceDto[]>([]);
  readonly chartViews = signal({
    types: 'histogram' as ChartView,
    services: 'bar' as ChartView,
    revenue: 'pareto' as ChartView,
    history: 'bar-grouped' as ChartView
  });

  readonly chartViewOptions = CHART_VIEW_OPTIONS;
  readonly filters = signal({
    from: '',
    to: '',
    types: [] as DemandeType[],
    statuts: [] as Array<'Brouillon' | 'En_attente' | 'Traitee' | 'Annulee'>,
    serviceIds: [] as number[]
  });

  readonly stats = computed<DashboardStats | null>(() => {
    const analytics = this.analytics();
    if (!analytics) {
      return null;
    }
    const totalAmount = analytics.revenueTotal ?? 0;
    const totalDemandes = analytics.totalDemandes ?? 0;
    const averagePerDemande = totalDemandes ? totalAmount / totalDemandes : 0;
    const clientCount = new Set(
      this.demandes()
        .map(demande => demande.client?.id_client)
        .filter((id): id is number => Number.isFinite(id))
    ).size;
    const averagePerClient = clientCount ? totalAmount / clientCount : 0;
    return {
      ...analytics,
      budget: {
        total: totalAmount,
        averagePerDemande,
        averagePerClient
      }
    };
  });

  readonly latestDemandes = computed(() =>
    this.demandes()
      .slice()
      .sort((a, b) => new Date(b.date_demande).getTime() - new Date(a.date_demande).getTime())
      .slice(0, 5)
  );

  ngOnInit(): void {
    this.loadDemandes();
    this.loadYearlyStats();
    this.loadAnalytics();
    this.loadServicesCatalog();
    this.navSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.loadDemandes(true);
        this.loadYearlyStats(true);
        this.loadAnalytics(true);
      });
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  refresh(): void {
    this.loadDemandes(true);
    this.loadYearlyStats(true);
    this.loadAnalytics(true);
  }

  private loadDemandes(silent = false): void {
    this.loading.set(!silent);
    if (!silent) {
      this.error.set(null);
    }
    this.demandesApi.getAll({ silentError: silent }).subscribe({
      next: rows => {
        this.demandes.set(rows);
        this.loading.set(false);
      },
      error: err => {
        const fallback = 'Impossible de charger les indicateurs du tableau de bord.';
        this.error.set(err?.error?.message || err?.message || fallback);
        this.loading.set(false);
      }
    });
  }

  private loadYearlyStats(silent = false): void {
    this.adminStatsApi.getStats().subscribe({
      next: data => {
        this.statsMeta.set(data);
        this.yearlyStats.set(data?.yearly ?? []);
      },
      error: err => {
        if (!silent) {
          const fallback = 'Impossible de charger les statistiques annuelles.';
          this.error.set(err?.error?.message || err?.message || fallback);
        }
      }
    });
  }

  private loadAnalytics(silent = false): void {
    const filters = this.filters();
    const params = {
      from: filters.from ? new Date(filters.from).toISOString() : undefined,
      to: filters.to ? new Date(filters.to).toISOString() : undefined,
      types: filters.types.length ? filters.types : undefined,
      statuts: filters.statuts.length ? filters.statuts : undefined,
      serviceIds: filters.serviceIds.length ? filters.serviceIds : undefined,
      includeForecast: true
    };
    this.adminStatsApi.getAnalytics(params).subscribe({
      next: data => {
        this.analytics.set(data);
        if (data?.yearly) {
          this.yearlyStats.set(data.yearly);
        }
      },
      error: err => {
        if (!silent) {
          const fallback = 'Impossible de charger les statistiques analytiques.';
          this.error.set(err?.error?.message || err?.message || fallback);
        }
      }
    });
  }

  private loadServicesCatalog(): void {
    this.servicesApi.getAll().subscribe({
      next: rows => this.servicesCatalog.set(Array.isArray(rows) ? rows : []),
      error: () => this.servicesCatalog.set([])
    });
  }

  updateFilterDate(field: 'from' | 'to', value: string) {
    this.filters.update(current => ({ ...current, [field]: value }));
  }

  updateFilterMultiSelect(field: 'types' | 'statuts' | 'serviceIds', value: string[]) {
    if (field === 'serviceIds') {
      this.filters.update(current => ({
        ...current,
        serviceIds: value.map(item => Number(item)).filter(id => Number.isFinite(id))
      }));
      return;
    }
    this.filters.update(current => ({ ...current, [field]: value }));
  }

  applyFilters(): void {
    this.loadAnalytics(true);
  }

  resetFilters(): void {
    this.filters.set({
      from: '',
      to: '',
      types: [],
      statuts: [],
      serviceIds: []
    });
    this.loadAnalytics(true);
  }

  getSingleSelectedValue(event: Event): string[] {
    const target = event.target as HTMLSelectElement;
    const value = target?.value?.trim();
    return value ? [value] : [];
  }

  updateChartView(section: ChartViewSection, value: string): void {
    const normalized = this.chartViewOptions.find(option => option.value === value)?.value;
    if (!normalized) {
      return;
    }
    this.chartViews.update(current => ({ ...current, [section]: normalized }));
  }

  getChartViewLabel(view: ChartView): string {
    return this.chartViewOptions.find(option => option.value === view)?.label ?? 'Vue';
  }

  getDemandeId(demande: DemandeWithServices): number {
    return Number(demande?.id_demande) || 0;
  }
}
