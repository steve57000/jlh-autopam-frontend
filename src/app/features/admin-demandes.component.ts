import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DemandesServiceService } from '../services/demandes-services.service';
import { DemandeWithServices } from '../modeles/demande.model';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'admin-demandes',
  templateUrl: './admin-demandes.component.html',
  styleUrls: ['./admin-demandes.component.scss'],
  imports: [DatePipe, FormsModule],
  standalone: true
})
export class AdminDemandesComponent implements OnInit {
  private api = inject(DemandesServiceService);

  // Données
  loading = signal(true);
  error = signal<string | null>(null);
  demandes = signal<DemandeWithServices[]>([]);

  // Filtres
  type = signal<'Tous'|'Devis'|'Service'|'RendezVous'>('Tous');
  statut = signal<'Tous'|'En_attente'|'Traitee'|'Annulee'>('Tous');
  q = signal('');
  dateFrom = signal<string | null>(null); // 'YYYY-MM-DD'
  dateTo = signal<string | null>(null);

  // Liste des types/statuts pour le template
  readonly types = ['Tous','Devis','Service','RendezVous'] as const;
  readonly statuts = ['Tous','En_attente','Traitee','Annulee'] as const;

  filtered = computed(() => {
    const t = this.type();
    const s = this.statut();
    const term = this.q().toLowerCase().trim();
    const from = this.dateFrom() ? new Date(this.dateFrom()! + 'T00:00:00') : null;
    const to = this.dateTo() ? new Date(this.dateTo()! + 'T23:59:59') : null;

    return this.demandes().filter(d => {
      if (t !== 'Tous' && d.code_type !== t) return false;
      if (s !== 'Tous' && d.code_statut !== s) return false;
      if (from && new Date(d.date_demande) < from) return false;
      if (to && new Date(d.date_demande) > to) return false;
      if (term) {
        const hay = [
          d.client?.nom,
          d.client?.prenom,
          d.client?.email,
          d.code_type,
          d.type_libelle, // 👈 ajouté
          d.code_statut,
          d.statut_libelle, // 👈 ajouté
          ...d.services.map(sv => sv.libelle)
        ].join(' ').toLowerCase();

        if (!hay.includes(term)) return false;
      }
      return true;
    }).sort((a,b) => new Date(b.date_demande).getTime() - new Date(a.date_demande).getTime());
  });

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.loading.set(true); this.error.set(null);
    this.api.getAll().subscribe({
      next: (rows: DemandeWithServices[]) => {
        this.demandes.set(rows);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.error.set('Impossible de charger les demandes');
        this.loading.set(false);
      }
    });
  }

  getDemandeId(d: any): number | null {
    const n = Number(d?.id_demande ?? d?.idDemande ?? d?.id ?? d?.demandeId);
    return Number.isFinite(n) ? n : null;
  }

  getServiceKey(s: any): string {
    const did = s?.idDemande ?? s?.id?.idDemande ?? 'd?';
    const sid = s?.id_service ?? s?.idService ?? s?.id?.idService ?? 's?';
    return `${did}-${sid}`;
  }

  marquerTraitee(d: any) {
    if (d.code_statut === 'Traitee') return;
    const id = this.getDemandeId(d);
    if (id == null) return alert('ID demande introuvable');

    this.api.setStatut(id, 'Traitee').subscribe({
      next: () => this.demandes.update(list =>
        list.map(x => this.getDemandeId(x) === id ? { ...x, code_statut: 'Traitee' } : x)
      ),
      error: () => alert('Échec de la mise à jour du statut')
    });
  }

  supprimer(d: any) {
    const id = this.getDemandeId(d);
    if (id == null) return alert('ID demande introuvable');
    if (!confirm('Supprimer définitivement cette demande ?')) return;

    this.api.delete(id).subscribe({
      next: () => this.demandes.update(list =>
        list.filter(x => this.getDemandeId(x) !== id)
      ),
      error: () => alert('Échec de la suppression')
    });
  }
}
