import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { DemandeWithServices } from '../modeles/demande.model';
import { DemandesServiceService } from '../services/demandes-services.service';
import { filter, Subscription } from 'rxjs';

type DemandeType = DemandeWithServices['code_type'];

interface TypeStats {
  type: DemandeType;
  label: string;
  count: number;
  percentage: number;
  averageValue: number;
}

interface ServiceStats {
  label: string;
  count: number;
  percentage: number;
}

interface ServiceRevenueStats {
  label: string;
  amount: number;
  percentage: number;
}

interface BudgetStats {
  total: number;
  averagePerDemande: number;
  averagePerClient: number;
}

interface DashboardStats {
  totalDemandes: number;
  pending: number;
  traitees: number;
  annulees: number;
  typeStats: TypeStats[];
  serviceStats: ServiceStats[];
  revenueStats: ServiceRevenueStats[];
  revenueTotal: number;
  budget: BudgetStats;
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
  private readonly router = inject(Router);
  private navSub?: Subscription;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly demandes = signal<DemandeWithServices[]>([]);

  readonly stats = computed<DashboardStats>(() => {
    const rows = this.demandes();
    const total = rows.length;
    const typeOrder: DemandeType[] = ['Devis', 'RendezVous', 'Service'];
    const labels: Record<DemandeType, string> = {
      Devis: 'Demandes de devis',
      RendezVous: 'Rendez-vous',
      Service: 'Demandes de service'
    };

    const typeTotals: Record<DemandeType, number> = {
      Devis: 0,
      RendezVous: 0,
      Service: 0
    };

    const typeAmounts: Record<DemandeType, number> = {
      Devis: 0,
      RendezVous: 0,
      Service: 0
    };

    let pending = 0;
    let traitees = 0;
    let annulees = 0;
    let totalAmount = 0;
    const clientSpend = new Map<number, number>();

    const serviceCounts = new Map<string, number>();
    const serviceRevenue = new Map<string, number>();

    for (const demande of rows) {
      typeTotals[demande.code_type] ??= 0;
      typeTotals[demande.code_type] += 1;

      if (demande.code_statut === 'En_attente') pending += 1;
      if (demande.code_statut === 'Traitee') traitees += 1;
      if (demande.code_statut === 'Annulee') annulees += 1;

      const totalDemande = this.computeDemandeAmount(demande);
      totalAmount += totalDemande;
      typeAmounts[demande.code_type] ??= 0;
      typeAmounts[demande.code_type] += totalDemande;

      for (const service of demande.services ?? []) {
        const label = (service?.libelle || 'Service').trim();
        serviceCounts.set(label, (serviceCounts.get(label) ?? 0) + 1);
        const unit = Number(service.prix_unitaire ?? 0);
        const qty = Number(service.quantite ?? 1);
        if (isFinite(unit) && isFinite(qty)) {
          serviceRevenue.set(label, (serviceRevenue.get(label) ?? 0) + unit * qty);
        }
      }

      const clientId = demande.client?.id_client;
      if (clientId != null) {
        clientSpend.set(clientId, (clientSpend.get(clientId) ?? 0) + totalDemande);
      }
    }

    const typeStats: TypeStats[] = typeOrder.map(type => {
      const count = typeTotals[type] ?? 0;
      return {
        type,
        label: labels[type],
        count,
        percentage: total ? Math.round((count / total) * 100) : 0,
        averageValue: count ? typeAmounts[type] / count : 0
      };
    });

    const totalServices = Array.from(serviceCounts.values()).reduce((sum, value) => sum + value, 0);
    const serviceStats: ServiceStats[] = Array.from(serviceCounts.entries())
      .map(([label, count]) => ({
        label,
        count,
        percentage: totalServices ? Math.round((count / totalServices) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const totalRevenue = Array.from(serviceRevenue.values()).reduce((sum, value) => sum + value, 0);
    const revenueStats: ServiceRevenueStats[] = Array.from(serviceRevenue.entries())
      .map(([label, amount]) => ({
        label,
        amount,
        percentage: totalRevenue ? Math.round((amount / totalRevenue) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    const budget: BudgetStats = {
      total: totalAmount,
      averagePerDemande: total ? totalAmount / total : 0,
      averagePerClient: clientSpend.size ? totalAmount / clientSpend.size : 0
    };

    return {
      totalDemandes: total,
      pending,
      traitees,
      annulees,
      typeStats,
      serviceStats,
      revenueStats,
      revenueTotal: totalRevenue,
      budget
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
    this.navSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.loadDemandes(true));
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  refresh(): void {
    this.loadDemandes(true);
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

  private computeDemandeAmount(demande: DemandeWithServices): number {
    if (!demande?.services?.length) return 0;
    return demande.services.reduce((total, service) => {
      const unit = Number(service.prix_unitaire ?? 0);
      const qty = Number(service.quantite ?? 1);
      if (!isFinite(unit) || !isFinite(qty)) {
        return total;
      }
      return total + unit * qty;
    }, 0);
  }

  getDemandeId(demande: DemandeWithServices): number {
    return Number(demande?.id_demande) || 0;
  }
}
