import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ClientDashboardService, DemandeResponse } from '../services/client-dashboard.service';

type CodeStatut = 'En_attente' | 'Traitee' | 'Annulee' | 'Confirme' | 'Reporte' | 'Annule';

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
  dateDebut: string; // ISO string (Instant)
  dateFin: string;   // ISO string (Instant)
}

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './client-dashboard.component.html',
  styleUrls: ['./client-dashboard.component.scss']
})
export class ClientDashboardComponent implements OnInit {
  loading = false;
  error = '';

  demandes: DemandeResponse[] = [];
  stats: ClientStatsDto | null = null;
  prochainRdv: ProchainRdvDto | null = null;

  constructor(private srv: ClientDashboardService) {}

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.loading = true;
    this.error = '';

    // On lance en parallèle les 3 chargements
    this.srv.getMyDemandes().subscribe({
      next: list => { this.demandes = list; },
      error: err => this.error = err?.error?.message || err.message || 'Erreur de chargement des demandes'
    });

    this.srv.getMyStats().subscribe({
      next: s => { this.stats = s; },
      error: err => this.error ||= err?.error?.message || err.message || 'Erreur de chargement des statistiques'
    });

    this.srv.getProchainRdv().subscribe({
      next: rdv => { this.prochainRdv = rdv || null; },
      error: err => {
        // 204 No Content => rien, sinon message
        if (err.status !== 204) {
          this.error ||= err?.error?.message || err.message || 'Erreur de chargement du prochain RDV';
        }
      },
      complete: () => { this.loading = false; }
    });
  }

  totalDemande(d: DemandeResponse): number {
    if (!d?.services?.length) return 0;
    return d.services.reduce((sum, s) => sum + (s.prixUnitaire || 0) * (s.quantite || 0), 0);
  }

  badgeClassForDemande(code?: string): string {
    switch (code) {
      case 'Traitee': return 'badge success';
      case 'Annulee': return 'badge danger';
      case 'En_attente': return 'badge warning';
      default: return 'badge';
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

  downloadIcs() {
    this.srv.getProchainRdvIcs().subscribe({
      next: (res) => {
        const blob = new Blob([res.body!], { type: 'text/calendar;charset=UTF-8' });

        // Essaie de récupérer le nom de fichier depuis Content-Disposition
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
      },
      error: (err) => {
        if (err.status === 204) {
          this.error = 'Aucun rendez-vous à venir.';
        } else {
          this.error = err?.error?.message || err.message || 'Téléchargement ICS impossible';
        }
      }
    });
  }
}
