import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DemandeWithServices } from '../modeles/demande.model';
import { DemandesServiceService } from '../services/demandes-services.service';

@Component({
  selector: 'app-manager-dashboard',
  templateUrl: './manager-dashboard.component.html',
  styleUrls: ['./manager-dashboard.component.scss'],
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink]
})
export class ManagerDashboardComponent implements OnInit {
  private readonly demandesApi = inject(DemandesServiceService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly demandes = signal<DemandeWithServices[]>([]);


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

  getDemandeId(demande: DemandeWithServices): number {
    return Number(demande?.id_demande) || 0;
  }
}
