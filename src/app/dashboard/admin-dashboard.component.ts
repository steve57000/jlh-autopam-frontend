import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DemandeWithServices } from '../modeles/demande.model';
import { DemandesServiceService } from '../services/demandes-services.service';

type DemandeType = DemandeWithServices['code_type'];

interface TypeStats {
  type: DemandeType;
  label: string;
  count: number;
  percentage: number;
  averageValue: number;
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
  budget: BudgetStats;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink]
})
export class AdminDashboardComponent implements OnInit {
  private readonly demandesApi = inject(DemandesServiceService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly demandes = signal<DemandeWithServices[]>([]);

  readonly stats = computed<DashboardStats>(() => {
    const rows = this.demandes();
    const total = rows.length;
    const typeOrder: DemandeType[] = ['Devis', 'Libre', 'Service'];
    const labels: Record<DemandeType, string> = {
      Devis: 'Demandes de devis',
      Libre: 'Rendez-vous libres',
      Service: 'Demandes de service'
    };

    const typeTotals: Record<DemandeType, number> = {
      Devis: 0,
      Libre: 0,
      Service: 0
    };

    const typeAmounts: Record<DemandeType, number> = {
      Devis: 0,
      Libre: 0,
      Service: 0
    };

    let pending = 0;
    let traitees = 0;
    let annulees = 0;
    let totalAmount = 0;
    const clientSpend = new Map<number, number>();

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
