import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { arc, area, curveMonotoneX, extent, line, max, pie, scaleBand, scaleLinear, scaleTime, timeMonth } from 'd3';
import type { PieArcDatum } from 'd3';
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

const STATUS_META = [
  { code: 'Brouillon', label: 'Brouillon', color: '#94a3b8' },
  { code: 'En_attente', label: 'En attente', color: '#f59e0b' },
  { code: 'Traitee', label: 'Confirmée', color: '#22c55e' },
  { code: 'Annulee', label: 'Annulée', color: '#ef4444' }
];

const WEEKDAY_META = [
  { key: 1, label: 'Lun.' },
  { key: 2, label: 'Mar.' },
  { key: 3, label: 'Mer.' },
  { key: 4, label: 'Jeu.' },
  { key: 5, label: 'Ven.' },
  { key: 6, label: 'Sam.' },
  { key: 0, label: 'Dim.' }
];

const CHART_SIZE = {
  width: 920,
  height: 360,
  margin: {
    top: 24,
    right: 36,
    bottom: 60,
    left: 64
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
  avgLabelY: number;
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
  countLabelY: number;
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

interface DonutSegment {
  label: string;
  value: number;
  percentage: number;
  color: string;
  path: string;
  centroidX: number;
  centroidY: number;
}

interface StatusChartBar {
  label: string;
  count: number;
  percentage: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface StatusChartModel {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  margin: typeof CHART_SIZE.margin;
  yTicks: ChartTick[];
  bars: StatusChartBar[];
  segments: DonutSegment[];
  total: number;
  centerX: number;
  centerY: number;
}

interface TrendChartBar {
  label: string;
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TrendChartPoint {
  date: Date;
  label: string;
  value: number;
  x: number;
  y: number;
}

interface TrendChartModel {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  margin: typeof CHART_SIZE.margin;
  yTicks: ChartTick[];
  xTicks: ChartTick[];
  bars: TrendChartBar[];
  linePath: string;
  areaPath: string;
  points: TrendChartPoint[];
  summaryPoints: TrendChartPoint[];
}

interface ServiceMixChartModel {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  margin: typeof CHART_SIZE.margin;
  segments: DonutSegment[];
  total: number;
  centerX: number;
  centerY: number;
}

interface WeekdayChartBar {
  label: string;
  value: number;
  percentage: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface WeekdayChartModel {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  margin: typeof CHART_SIZE.margin;
  yTicks: ChartTick[];
  bars: WeekdayChartBar[];
  total: number;
}

interface YearChartPoint {
  year: number;
  revenue: number;
  forecast: boolean;
  x: number;
  y: number;
  labelY: number;
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
  readonly statusDisplay = signal<'bars' | 'donut'>('bars');
  readonly trendDisplay = signal<'line' | 'area'>('area');
  readonly serviceMixMetric = signal<'revenue' | 'count'>('revenue');
  readonly weekdayMetric = signal<'count' | 'percentage'>('count');
  private readonly monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' });
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
      const avgY = avgScale(row.averageValue);
      const avgLabelY = Math.max(avgY - 12, 8);
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
        avgY,
        avgLabelY,
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
      const countY = countScale(row.count);
      const countLabelY = Math.max(countY - 10, 8);
      return {
        label: row.label,
        count: row.count,
        revenue: row.revenue,
        x,
        y: revenueScale(row.revenue),
        width,
        xCenter: x + width / 2,
        countY,
        countLabelY,
        color: this.getSeriesColor(index)
      };
    });
    const lineGenerator = line<ServiceChartPoint>()
      .x((point: ServiceChartPoint) => point.xCenter)
      .y((point: ServiceChartPoint) => point.countY)
      .curve(curveMonotoneX);
    const linePath = lineGenerator(bars) ?? '';
    const yTicks = revenueScale.ticks(4).map((value: number) => ({ value, x: 0, y: revenueScale(value) }));
    const yRightTicks = countScale
      .ticks(4)
      .map((value: number) => ({ value, x: innerWidth, y: countScale(value) }));
    return { width, height, innerWidth, innerHeight, margin, yTicks, yRightTicks, bars, linePath };
  });

  readonly statusChart = computed<StatusChartModel | null>(() => {
    const demandes = this.demandes();
    if (!demandes.length) {
      return null;
    }
    const totals = STATUS_META.map(status => {
      const count = demandes.filter(demande => demande.code_statut === status.code).length;
      return { ...status, count };
    });
    const total = totals.reduce((sum, row) => sum + row.count, 0);
    if (!total) {
      return null;
    }
    const { width, height, margin } = CHART_SIZE;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const xScale = scaleBand().domain(totals.map(row => row.label)).range([0, innerWidth]).padding(0.3);
    const yScale = scaleLinear()
      .domain([0, Math.max(max(totals, (row: { count: number }) => row.count) ?? 0, 1)])
      .nice()
      .range([innerHeight, 0]);
    const bars = totals.map(row => {
      const x = xScale(row.label) ?? 0;
      const y = yScale(row.count);
      const width = xScale.bandwidth();
      return {
        label: row.label,
        count: row.count,
        percentage: total ? Math.round((row.count / total) * 100) : 0,
        x,
        y,
        width,
        height: innerHeight - y,
        color: row.color
      };
    });
    const radius = Math.min(innerWidth, innerHeight) / 2 - 10;
    const donutGenerator = arc<PieArcDatum<{ label: string; count: number; color: string }>>()
      .innerRadius(radius * 0.55)
      .outerRadius(radius);
    const pieGenerator = pie<{ label: string; count: number; color: string }>()
      .value((row: { label: string; count: number; color: string }) => row.count)
      .sort(null);
    const segments = pieGenerator(totals).map((arcData: PieArcDatum<{ label: string; count: number; color: string }>) => {
      const centroid = donutGenerator.centroid(arcData);
      return {
        label: arcData.data.label,
        value: arcData.data.count,
        percentage: total ? Math.round((arcData.data.count / total) * 100) : 0,
        color: arcData.data.color,
        path: donutGenerator(arcData) ?? '',
        centroidX: centroid[0],
        centroidY: centroid[1]
      };
    });
    const yTicks = yScale.ticks(4).map((value: number) => ({ value, x: 0, y: yScale(value) }));
    return {
      width,
      height,
      innerWidth,
      innerHeight,
      margin,
      yTicks,
      bars,
      segments,
      total,
      centerX: margin.left + innerWidth / 2,
      centerY: margin.top + innerHeight / 2
    };
  });

  readonly trendChart = computed<TrendChartModel | null>(() => {
    const demandes = this.demandes();
    if (!demandes.length) {
      return null;
    }
    const dates = demandes.map(row => new Date(row.date_demande)).filter(date => !Number.isNaN(date.getTime()));
    if (!dates.length) {
      return null;
    }
    const minDate = new Date(Math.min(...dates.map(date => date.getTime())));
    const maxDate = new Date(Math.max(...dates.map(date => date.getTime())));
    const start = timeMonth.floor(minDate);
    const end = timeMonth.ceil(maxDate);
    const months: Date[] = timeMonth.range(start, timeMonth.offset(end, 1));
    const counts = new Map<string, number>();
    months.forEach((month: Date) => counts.set(month.toISOString(), 0));
    demandes.forEach(demande => {
      const date = new Date(demande.date_demande);
      if (Number.isNaN(date.getTime())) {
        return;
      }
      const monthKey = timeMonth.floor(date).toISOString();
      counts.set(monthKey, (counts.get(monthKey) ?? 0) + 1);
    });
    const rows: Array<{ date: Date; label: string; value: number }> = months.map(month => ({
      date: month,
      label: this.monthFormatter.format(month),
      value: counts.get(month.toISOString()) ?? 0
    }));
    const { width, height, margin } = CHART_SIZE;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const xScale = scaleTime().domain([rows[0].date, rows[rows.length - 1].date]).range([0, innerWidth]);
    const yScale = scaleLinear()
      .domain([0, Math.max(max(rows, (row: { value: number }) => row.value) ?? 0, 1)])
      .nice()
      .range([innerHeight, 0]);
    const points: TrendChartPoint[] = rows.map(row => ({
      ...row,
      x: xScale(row.date),
      y: yScale(row.value)
    }));
    const bandScale = scaleBand().domain(rows.map(row => row.label)).range([0, innerWidth]).padding(0.3);
    const bars: TrendChartBar[] = rows.map(row => {
      const x = bandScale(row.label) ?? 0;
      const y = yScale(row.value);
      const width = bandScale.bandwidth();
      return {
        label: row.label,
        value: row.value,
        x,
        y,
        width,
        height: innerHeight - y
      };
    });
    const lineGenerator = line<TrendChartPoint>()
      .x((point: TrendChartPoint) => point.x)
      .y((point: TrendChartPoint) => point.y)
      .curve(curveMonotoneX);
    const areaGenerator = area<TrendChartPoint>()
      .x((point: TrendChartPoint) => point.x)
      .y0(innerHeight)
      .y1((point: TrendChartPoint) => point.y)
      .curve(curveMonotoneX);
    const linePath = lineGenerator(points) ?? '';
    const areaPath = areaGenerator(points) ?? '';
    const tickStep = Math.max(1, Math.ceil(rows.length / 6));
    const xTicks: ChartTick[] = rows
      .map(row => ({ value: row.label, x: xScale(row.date), y: innerHeight }))
      .filter((_, index) => index % tickStep === 0 || index === rows.length - 1);
    const yTicks = yScale.ticks(4).map((value: number) => ({ value, x: 0, y: yScale(value) }));
    return {
      width,
      height,
      innerWidth,
      innerHeight,
      margin,
      yTicks,
      xTicks,
      bars,
      linePath,
      areaPath,
      points,
      summaryPoints: points.slice(-6)
    };
  });

  readonly serviceMixChart = computed<ServiceMixChartModel | null>(() => {
    const rows = ((this.analytics()?.serviceStats ?? []) as AdminDashboardServiceStat[])
      .slice()
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
    if (!rows.length) {
      return null;
    }
    const metric = this.serviceMixMetric();
    const values = rows.map((row, index) => ({
      label: row.label,
      value: metric === 'revenue' ? row.revenue : row.count,
      color: this.getSeriesColor(index)
    }));
    const total = values.reduce((sum, row) => sum + row.value, 0);
    if (!total) {
      return null;
    }
    const { width, height, margin } = CHART_SIZE;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const radius = Math.min(innerWidth, innerHeight) / 2 - 10;
    const donutGenerator = arc<PieArcDatum<{ label: string; value: number; color: string }>>()
      .innerRadius(radius * 0.55)
      .outerRadius(radius);
    const pieGenerator = pie<{ label: string; value: number; color: string }>()
      .value((row: { label: string; value: number; color: string }) => row.value)
      .sort(null);
    const segments = pieGenerator(values).map((arcData: PieArcDatum<{ label: string; value: number; color: string }>) => {
      const centroid = donutGenerator.centroid(arcData);
      return {
        label: arcData.data.label,
        value: arcData.data.value,
        percentage: total ? Math.round((arcData.data.value / total) * 100) : 0,
        color: arcData.data.color,
        path: donutGenerator(arcData) ?? '',
        centroidX: centroid[0],
        centroidY: centroid[1]
      };
    });
    return {
      width,
      height,
      innerWidth,
      innerHeight,
      margin,
      segments,
      total,
      centerX: margin.left + innerWidth / 2,
      centerY: margin.top + innerHeight / 2
    };
  });

  readonly weekdayChart = computed<WeekdayChartModel | null>(() => {
    const demandes = this.demandes();
    if (!demandes.length) {
      return null;
    }
    const totals = WEEKDAY_META.map(day => {
      const count = demandes.filter(demande => new Date(demande.date_demande).getDay() === day.key).length;
      return { ...day, count };
    });
    const total = totals.reduce((sum, row) => sum + row.count, 0);
    if (!total) {
      return null;
    }
    const { width, height, margin } = CHART_SIZE;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const xScale = scaleBand().domain(totals.map(row => row.label)).range([0, innerWidth]).padding(0.25);
    const metric = this.weekdayMetric();
    const values = totals.map(row => ({
      ...row,
      value: metric === 'percentage' ? Math.round((row.count / total) * 100) : row.count
    }));
    const yScale = scaleLinear()
      .domain([0, Math.max(max(values, (row: { value: number }) => row.value) ?? 0, 1)])
      .nice()
      .range([innerHeight, 0]);
    const bars = values.map((row, index) => {
      const x = xScale(row.label) ?? 0;
      const y = yScale(row.value);
      const width = xScale.bandwidth();
      return {
        label: row.label,
        value: row.value,
        percentage: total ? Math.round((row.count / total) * 100) : 0,
        x,
        y,
        width,
        height: innerHeight - y,
        color: this.getSeriesColor(index)
      };
    });
    const yTicks = yScale.ticks(4).map((value: number) => ({ value, x: 0, y: yScale(value) }));
    return {
      width,
      height,
      innerWidth,
      innerHeight,
      margin,
      yTicks,
      bars,
      total
    };
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
    const points = rows.map(row => {
      const y = yScale(row.serviceRevenue);
      return {
        year: row.year,
        revenue: row.serviceRevenue,
        forecast: row.forecast,
        x: xScale(row.year),
        y,
        labelY: Math.max(y - 10, 8)
      };
    });
    const actualPoints = points.filter(point => !point.forecast);
    const forecastPoints = points.filter(point => point.forecast);
    const forecastLinePoints = actualPoints.length
      ? [actualPoints[actualPoints.length - 1], ...forecastPoints]
      : forecastPoints;
    const lineGenerator = line<YearChartPoint>()
      .x((point: YearChartPoint) => point.x)
      .y((point: YearChartPoint) => point.y)
      .curve(curveMonotoneX);
    const areaGenerator = area<YearChartPoint>()
      .x((point: YearChartPoint) => point.x)
      .y0(innerHeight)
      .y1((point: YearChartPoint) => point.y)
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

  updateStatusDisplay(value: string): void {
    if (value === 'donut' || value === 'bars') {
      this.statusDisplay.set(value);
    }
  }

  updateTrendDisplay(value: string): void {
    if (value === 'line' || value === 'area') {
      this.trendDisplay.set(value);
    }
  }

  updateServiceMixMetric(value: string): void {
    if (value === 'revenue' || value === 'count') {
      this.serviceMixMetric.set(value);
    }
  }

  updateWeekdayMetric(value: string): void {
    if (value === 'count' || value === 'percentage') {
      this.weekdayMetric.set(value);
    }
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

  formatServiceMixTooltip(segment: DonutSegment): string {
    if (this.serviceMixMetric() === 'revenue') {
      return `${segment.label} : ${segment.value.toLocaleString('fr-FR')} € (${segment.percentage}%)`;
    }
    return `${segment.label} : ${segment.value} demandes (${segment.percentage}%)`;
  }

  getDemandeId(demande: DemandeWithServices): number {
    return Number(demande?.id_demande) || 0;
  }
}
