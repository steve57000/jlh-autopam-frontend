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
  | 'bar-grouped-vertical'
  | 'bar-stacked'
  | 'line'
  | 'line-categories'
  | 'pie'
  | 'heatmap'
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
  { value: 'bar-grouped-vertical', label: 'Diagrammes en barres groupés' },
  { value: 'bar-stacked', label: 'Diagrammes en barres empilées' },
  { value: 'line', label: 'Graphiques linéaires' },
  { value: 'line-categories', label: 'Graphiques linéaires avec catégories' },
  { value: 'pie', label: 'Diagrammes en secteurs' },
  { value: 'heatmap', label: 'Cartes thermiques' },
  { value: 'pareto', label: 'Diagrammes de Pareto' },
  { value: 'mosaic', label: 'Graphiques en mosaïque' },
  { value: 'treemap', label: 'Treemaps' },
  { value: 'boxplot', label: 'Boîtes à moustaches' }
];

const TYPE_COLORS: Record<string, string> = {
  Devis: '#2563eb',
  Service: '#14b8a6',
  RendezVous: '#f97316',
  'Rendez-vous': '#f97316'
};

const SERIES_PALETTE = [
  '#0ea5e9',
  '#a855f7',
  '#f97316',
  '#10b981',
  '#e11d48',
  '#64748b',
  '#22c55e'
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
  readonly typeCountSeries = computed(() => this.analytics()?.typeStats.map(row => row.count) ?? []);
  readonly typeAverageSeries = computed(() => this.analytics()?.typeStats.map(row => row.averageValue) ?? []);
  readonly serviceCountSeries = computed(() => this.analytics()?.serviceStats.map(row => row.count) ?? []);
  readonly serviceRevenueSeries = computed(() => this.analytics()?.serviceStats.map(row => row.revenue) ?? []);
  readonly revenueAmountSeries = computed(() => this.analytics()?.revenueStats.map(row => row.amount) ?? []);
  readonly historyServiceRevenueSeries = computed(() => this.yearlyStats().map(row => row.serviceRevenue));
  readonly historyServiceCountSeries = computed(() => this.yearlyStats().map(row => row.serviceCount));
  readonly historyDevisCountSeries = computed(() => this.yearlyStats().map(row => row.devisCount));
  readonly historyRendezVousCountSeries = computed(() => this.yearlyStats().map(row => row.rendezVousCount));
  readonly historyDevisRevenueSeries = computed(() => this.yearlyStats().map(row => row.devisRevenue));

  readonly typeMaxCount = computed(() => this.getMaxValue(this.typeCountSeries()));
  readonly typeMaxAverage = computed(() => this.getMaxValue(this.typeAverageSeries()));
  readonly serviceMaxCount = computed(() => this.getMaxValue(this.serviceCountSeries()));
  readonly serviceMaxRevenue = computed(() => this.getMaxValue(this.serviceRevenueSeries()));
  readonly revenueMaxAmount = computed(() => this.getMaxValue(this.revenueAmountSeries()));
  readonly historyMaxServiceRevenue = computed(() => this.getMaxValue(this.historyServiceRevenueSeries()));
  readonly historyMaxServiceCount = computed(() => this.getMaxValue(this.historyServiceCountSeries()));
  readonly historyMaxDevisCount = computed(() => this.getMaxValue(this.historyDevisCountSeries()));
  readonly historyMaxRendezVousCount = computed(() => this.getMaxValue(this.historyRendezVousCountSeries()));
  readonly historyMaxDevisRevenue = computed(() => this.getMaxValue(this.historyDevisRevenueSeries()));
  readonly typePareto = computed(() =>
    this.buildParetoData(
      this.analytics()?.typeStats ?? [],
      row => row.count,
      row => row.label
    )
  );
  readonly servicePareto = computed(() =>
    this.buildParetoData(
      this.analytics()?.serviceStats ?? [],
      row => row.count,
      row => row.label
    )
  );
  readonly revenuePareto = computed(() =>
    this.buildParetoData(
      this.analytics()?.revenueStats ?? [],
      row => row.amount,
      row => row.label
    )
  );
  readonly historyPareto = computed(() =>
    this.buildParetoData(
      this.yearlyStats(),
      row => row.serviceRevenue,
      row => String(row.year)
    )
  );
  readonly typeBoxplot = computed(() =>
    this.getBoxPlotStats(this.analytics()?.typeStats.map(row => row.averageValue) ?? [])
  );
  readonly serviceBoxplot = computed(() =>
    this.getBoxPlotStats(this.analytics()?.serviceStats.map(row => row.revenue) ?? [])
  );
  readonly revenueBoxplot = computed(() =>
    this.getBoxPlotStats(this.analytics()?.revenueStats.map(row => row.amount) ?? [])
  );
  readonly historyBoxplot = computed(() =>
    this.getBoxPlotStats(this.yearlyStats().map(row => row.serviceRevenue))
  );

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

  getMaxValue(values: number[]): number {
    if (!values.length) {
      return 1;
    }
    return Math.max(...values, 1);
  }

  getPercent(value: number, max: number): number {
    if (!max) {
      return 0;
    }
    return (value / max) * 100;
  }

  getStackedPercents(values: number[]): number[] {
    const total = values.reduce((sum, value) => sum + value, 0);
    if (!total) {
      return values.map(() => 0);
    }
    return values.map(value => (value / total) * 100);
  }

  buildParetoData<T>(rows: T[], getValue: (row: T) => number, getLabel: (row: T) => string) {
    const mapped = rows
      .map(row => ({
        label: getLabel(row),
        value: getValue(row)
      }))
      .filter(row => Number.isFinite(row.value));
    const total = mapped.reduce((sum, row) => sum + row.value, 0);
    const sorted = mapped.slice().sort((a, b) => b.value - a.value);
    let cumulative = 0;
    return sorted.map(row => {
      const percentage = total ? (row.value / total) * 100 : 0;
      cumulative += percentage;
      return {
        ...row,
        percentage,
        cumulative: Math.min(cumulative, 100)
      };
    });
  }

  getBoxPlotStats(values: number[]) {
    const clean = values.filter(value => Number.isFinite(value)).slice().sort((a, b) => a - b);
    if (!clean.length) {
      return { min: 0, q1: 0, median: 0, q3: 0, max: 0 };
    }
    return {
      min: clean[0],
      q1: this.getQuantile(clean, 0.25),
      median: this.getQuantile(clean, 0.5),
      q3: this.getQuantile(clean, 0.75),
      max: clean[clean.length - 1]
    };
  }

  getQuantile(sorted: number[], quantile: number): number {
    if (!sorted.length) {
      return 0;
    }
    const position = (sorted.length - 1) * quantile;
    const base = Math.floor(position);
    const rest = position - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    }
    return sorted[base];
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

  isWideView(view: ChartView): boolean {
    return ['histogram-side-by-side', 'bar-grouped-vertical', 'line', 'line-categories', 'pie', 'heatmap'].includes(
      view
    );
  }

  getTypeColor(type: string): string {
    return TYPE_COLORS[type] ?? '#64748b';
  }

  getSeriesColor(index: number): string {
    return SERIES_PALETTE[index % SERIES_PALETTE.length];
  }

  getHistoryMetricColor(metric: 'services' | 'devis' | 'rdv'): string {
    switch (metric) {
      case 'services':
        return '#0ea5e9';
      case 'devis':
        return '#6366f1';
      case 'rdv':
        return '#f97316';
      default:
        return '#64748b';
    }
  }

  getLinePoints(values: number[], max: number): string {
    if (!values.length) {
      return '0,100';
    }
    const total = values.length;
    return values
      .map((value, index) => {
        const x = total > 1 ? (index / (total - 1)) * 100 : 0;
        const y = 100 - this.getPercent(value, max);
        return `${x},${y}`;
      })
      .join(' ');
  }

  getLinePointX(index: number, total: number): number {
    if (total <= 1) {
      return 0;
    }
    return (index / (total - 1)) * 100;
  }

  getLinePointY(value: number, max: number): number {
    return 100 - this.getPercent(value, max);
  }

  getTypeLinePoints(): string {
    return this.getLinePoints(this.typeCountSeries(), this.typeMaxCount());
  }

  getServiceLinePoints(): string {
    return this.getLinePoints(this.serviceCountSeries(), this.serviceMaxCount());
  }

  getRevenueLinePoints(): string {
    return this.getLinePoints(this.revenueAmountSeries(), this.revenueMaxAmount());
  }

  getHistoryLinePoints(metric: 'serviceRevenue' | 'devisRevenue' | 'rendezVousCount'): string {
    const values = this.yearlyStats().map(row => row[metric]);
    const max =
      metric === 'serviceRevenue'
        ? this.historyMaxServiceRevenue()
        : metric === 'devisRevenue'
          ? this.historyMaxDevisRevenue()
          : this.historyMaxRendezVousCount();
    return this.getLinePoints(values, max);
  }

  getPieGradient(entries: Array<{ value: number; color: string }>): string {
    const total = entries.reduce((sum, entry) => sum + entry.value, 0);
    if (!total) {
      return 'conic-gradient(#e2e8f0 0deg, #e2e8f0 360deg)';
    }
    let current = 0;
    const segments = entries
      .filter(entry => entry.value > 0)
      .map(entry => {
        const angle = (entry.value / total) * 360;
        const start = current;
        current += angle;
        return `${entry.color} ${start}deg ${current}deg`;
      });
    return `conic-gradient(${segments.join(', ')})`;
  }

  getHeatmapStrength(value: number, max: number): string {
    const strength = Math.max(15, Math.round(this.getPercent(value, max)));
    return `${strength}%`;
  }

  getTypePieGradient(): string {
    const stats = this.analytics()?.typeStats ?? [];
    return this.getPieGradient(stats.map(row => ({ value: row.count, color: this.getTypeColor(row.type) })));
  }

  getServicePieGradient(): string {
    const stats = this.analytics()?.serviceStats ?? [];
    return this.getPieGradient(stats.map((row, index) => ({ value: row.count, color: this.getSeriesColor(index) })));
  }

  getRevenuePieGradient(): string {
    const stats = this.analytics()?.revenueStats ?? [];
    return this.getPieGradient(stats.map((row, index) => ({ value: row.amount, color: this.getSeriesColor(index) })));
  }

  getHistoryPieGradient(): string {
    const latest = this.getLatestActualYear();
    if (!latest) {
      return this.getPieGradient([]);
    }
    return this.getPieGradient([
      { value: latest.serviceCount, color: this.getHistoryMetricColor('services') },
      { value: latest.devisCount, color: this.getHistoryMetricColor('devis') },
      { value: latest.rendezVousCount, color: this.getHistoryMetricColor('rdv') }
    ]);
  }

  getLatestActualYear(): AdminYearlyStats | null {
    const rows = this.yearlyStats().filter(row => !row.forecast);
    if (!rows.length) {
      return null;
    }
    return rows[rows.length - 1];
  }

  getDemandeId(demande: DemandeWithServices): number {
    return Number(demande?.id_demande) || 0;
  }
}
