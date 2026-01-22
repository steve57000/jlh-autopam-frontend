import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { area, curveMonotoneX, extent, line, max, scaleBand, scaleLinear } from 'd3';
import { DemandeWithServices } from '../modeles/demande.model';
import { DemandesServiceService } from '../services/demandes-services.service';
import {
  AdminDashboardAnalytics,
  AdminDashboardServiceStat,
  AdminDashboardStats,
  AdminDashboardStatsService,
  AdminDashboardTypeStat,
  AdminYearlyStats
} from '../services/admin-dashboard-stats.service';
import { ServicesService } from '../services/services.service';
import { ServiceDto } from '../modeles/service.model';
import { filter, Subscription } from 'rxjs';
type DemandeType = DemandeWithServices['code_type'];

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

const CHART_SIZE = {
  width: 640,
  height: 280,
  margin: {
    top: 24,
    right: 32,
    bottom: 50,
    left: 56
  }
};

interface ChartTick {
  value: number | string;
  x: number;
  y: number;
}

interface TypeChartBar {
  label: string;
  count: number;
  percentage: number;
  averageValue: number;
  x: number;
  y: number;
  width: number;
  height: number;
  xCenter: number;
  avgY: number;
  color: string;
}

interface TypeChartModel {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  margin: typeof CHART_SIZE.margin;
  yTicks: ChartTick[];
  bars: TypeChartBar[];
}

interface ServiceChartPoint {
  label: string;
  count: number;
  revenue: number;
  x: number;
  y: number;
  width: number;
  xCenter: number;
  countY: number;
  color: string;
}

interface ServiceChartModel {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  margin: typeof CHART_SIZE.margin;
  yTicks: ChartTick[];
  yRightTicks: ChartTick[];
  bars: ServiceChartPoint[];
  linePath: string;
}

interface YearChartPoint {
  year: number;
  revenue: number;
  forecast: boolean;
  x: number;
  y: number;
}

interface YearChartModel {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  margin: typeof CHART_SIZE.margin;
  xTicks: ChartTick[];
  yTicks: ChartTick[];
  areaPath: string;
  actualLinePath: string;
  forecastLinePath: string;
  points: YearChartPoint[];
}

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
  readonly filters = signal({
    from: '',
    to: '',
    types: [] as DemandeType[],
    statuts: [] as Array<'Brouillon' | 'En_attente' | 'Traitee' | 'Annulee'>,
    serviceIds: [] as number[]
  });
  readonly typeChart = computed<TypeChartModel | null>(() => {
    const rows = (this.analytics()?.typeStats ?? []) as AdminDashboardTypeStat[];
    if (!rows.length) {
      return null;
    }
    const { width, height, margin } = CHART_SIZE;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const xScale = scaleBand().domain(rows.map(row => row.label)).range([0, innerWidth]).padding(0.24);
    const yMax = max(rows, (row: AdminDashboardTypeStat) => row.count) ?? 0;
    const avgMax = max(rows, (row: AdminDashboardTypeStat) => row.averageValue) ?? 0;
    const yScale = scaleLinear().domain([0, Math.max(yMax, 1)]).nice().range([innerHeight, 0]);
    const avgScale = scaleLinear().domain([0, Math.max(avgMax, 1)]).nice().range([innerHeight, 0]);
    const bars = rows.map(row => {
      const x = xScale(row.label) ?? 0;
      const width = xScale.bandwidth();
      const y = yScale(row.count);
      return {
        label: row.label,
        count: row.count,
        percentage: row.percentage,
        averageValue: row.averageValue,
        x,
        y,
        width,
        height: innerHeight - y,
        xCenter: x + width / 2,
        avgY: avgScale(row.averageValue),
        color: this.getTypeColor(row.type)
      };
    });
    const yTicks = yScale.ticks(4).map((value: number) => ({ value, x: 0, y: yScale(value) }));
    return { width, height, innerWidth, innerHeight, margin, yTicks, bars };
  });

  readonly serviceChart = computed<ServiceChartModel | null>(() => {
    const rows = ((this.analytics()?.serviceStats ?? []) as AdminDashboardServiceStat[])
      .slice()
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
    if (!rows.length) {
      return null;
    }
    const { width, height, margin } = CHART_SIZE;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const xScale = scaleBand().domain(rows.map(row => row.label)).range([0, innerWidth]).padding(0.3);
    const revenueMax = max(rows, (row: AdminDashboardServiceStat) => row.revenue) ?? 0;
    const countMax = max(rows, (row: AdminDashboardServiceStat) => row.count) ?? 0;
    const revenueScale = scaleLinear().domain([0, Math.max(revenueMax, 1)]).nice().range([innerHeight, 0]);
    const countScale = scaleLinear().domain([0, Math.max(countMax, 1)]).nice().range([innerHeight, 0]);
    const bars = rows.map((row, index) => {
      const x = xScale(row.label) ?? 0;
      const width = xScale.bandwidth();
      return {
        label: row.label,
        count: row.count,
        revenue: row.revenue,
        x,
        y: revenueScale(row.revenue),
        width,
        xCenter: x + width / 2,
        countY: countScale(row.count),
        color: this.getSeriesColor(index)
      };
    });
    const lineGenerator = line<ServiceChartPoint>()
      .x(point => point.xCenter)
      .y(point => point.countY)
      .curve(curveMonotoneX);
    const linePath = lineGenerator(bars) ?? '';
    const yTicks = revenueScale.ticks(4).map((value: number) => ({ value, x: 0, y: revenueScale(value) }));
    const yRightTicks = countScale
      .ticks(4)
      .map((value: number) => ({ value, x: innerWidth, y: countScale(value) }));
    return { width, height, innerWidth, innerHeight, margin, yTicks, yRightTicks, bars, linePath };
  });

  readonly yearChart = computed<YearChartModel | null>(() => {
    const rows = this.yearlyStats().slice().sort((a, b) => a.year - b.year);
    if (!rows.length) {
      return null;
    }
    const { width, height, margin } = CHART_SIZE;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const yearExtent = extent(rows, (row: AdminYearlyStats) => row.year) as [number, number] | undefined;
    if (!yearExtent) {
      return null;
    }
    const xScale = scaleLinear().domain(yearExtent).range([0, innerWidth]);
    const revenueMax = max(rows, (row: AdminYearlyStats) => row.serviceRevenue) ?? 0;
    const yScale = scaleLinear().domain([0, Math.max(revenueMax, 1)]).nice().range([innerHeight, 0]);
    const points = rows.map(row => ({
      year: row.year,
      revenue: row.serviceRevenue,
      forecast: row.forecast,
      x: xScale(row.year),
      y: yScale(row.serviceRevenue)
    }));
    const actualPoints = points.filter(point => !point.forecast);
    const forecastPoints = points.filter(point => point.forecast);
    const forecastLinePoints = actualPoints.length
      ? [actualPoints[actualPoints.length - 1], ...forecastPoints]
      : forecastPoints;
    const lineGenerator = line<YearChartPoint>()
      .x(point => point.x)
      .y(point => point.y)
      .curve(curveMonotoneX);
    const areaGenerator = area<YearChartPoint>()
      .x(point => point.x)
      .y0(innerHeight)
      .y1(point => point.y)
      .curve(curveMonotoneX);
    const areaPath = areaGenerator(actualPoints) ?? '';
    const actualLinePath = lineGenerator(actualPoints) ?? '';
    const forecastLinePath = lineGenerator(forecastLinePoints) ?? '';
    const xTicks = xScale.ticks(Math.min(rows.length, 6)).map((value: number) => ({
      value: Math.round(value),
      x: xScale(value),
      y: innerHeight
    }));
    const yTicks = yScale.ticks(4).map((value: number) => ({ value, x: 0, y: yScale(value) }));
    return {
      width,
      height,
      innerWidth,
      innerHeight,
      margin,
      xTicks,
      yTicks,
      areaPath,
      actualLinePath,
      forecastLinePath,
      points
    };
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

  getTypeColor(type: string): string {
    return TYPE_COLORS[type] ?? '#64748b';
  }

  getSeriesColor(index: number): string {
    return SERIES_PALETTE[index % SERIES_PALETTE.length];
  }

  getDemandeId(demande: DemandeWithServices): number {
    return Number(demande?.id_demande) || 0;
  }
}
