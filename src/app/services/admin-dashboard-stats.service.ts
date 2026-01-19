import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';

export interface AdminYearlyStats {
  year: number;
  serviceCount: number;
  serviceRevenue: number;
  devisCount: number;
  devisRevenue: number;
  rendezVousCount: number;
  forecast: boolean;
}

export interface AdminDashboardStats {
  currentYear: number;
  yearly: AdminYearlyStats[];
}

export interface AdminDashboardTypeStat {
  type: string;
  label: string;
  count: number;
  percentage: number;
  averageValue: number;
}

export interface AdminDashboardServiceStat {
  label: string;
  count: number;
  percentage: number;
  revenue: number;
}

export interface AdminDashboardRevenueStat {
  label: string;
  amount: number;
  percentage: number;
}

export interface AdminDashboardAnalytics {
  totalDemandes: number;
  pending: number;
  traitees: number;
  annulees: number;
  devisTotal: number;
  devisAvecRdv: number;
  devisSansSuite: number;
  revenueTotal: number;
  typeStats: AdminDashboardTypeStat[];
  serviceStats: AdminDashboardServiceStat[];
  revenueStats: AdminDashboardRevenueStat[];
  yearly: AdminYearlyStats[];
}

@Injectable({ providedIn: 'root' })
export class AdminDashboardStatsService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/admin/dashboard-stats`;

  getStats() {
    return this.http.get<AdminDashboardStats>(this.base);
  }

  getAnalytics(params: {
    from?: string;
    to?: string;
    types?: string[];
    statuts?: string[];
    serviceIds?: number[];
    includeForecast?: boolean;
  }) {
    const search = new URLSearchParams();
    if (params.from) search.set('from', params.from);
    if (params.to) search.set('to', params.to);
    if (params.types?.length) params.types.forEach(type => search.append('types', type));
    if (params.statuts?.length) params.statuts.forEach(statut => search.append('statuts', statut));
    if (params.serviceIds?.length) params.serviceIds.forEach(id => search.append('serviceIds', String(id)));
    if (params.includeForecast === false) search.set('includeForecast', 'false');
    const query = search.toString();
    return this.http.get<AdminDashboardAnalytics>(`${this.base}/analytics${query ? `?${query}` : ''}`);
  }
}
