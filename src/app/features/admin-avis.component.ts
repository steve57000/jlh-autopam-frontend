import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AvisServicesService } from '../services/avis-services.service';
import type { AvisServiceDto } from '../modeles/avis-service.model';
import { ToastService } from '../shared/toast/toast.service';

@Component({
  selector: 'admin-avis',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './admin-avis.component.html',
  styleUrls: ['./admin-avis.component.scss']
})
export class AdminAvisComponent implements OnInit {
  private readonly avisApi = inject(AvisServicesService);
  private readonly toast = inject(ToastService);

  loading = signal(false);
  error = signal<string | null>(null);
  avis = signal<AvisServiceDto[]>([]);

  refusDraft: Record<number, string> = {};
  moderatingIds = signal<Record<number, boolean>>({});

  ngOnInit(): void {
    this.loadPendingAvis();
  }

  loadPendingAvis(): void {
    this.loading.set(true);
    this.error.set(null);

    this.avisApi
      .getAvisPage({ statut: 'PENDING' }, { page: 0, size: 100, sort: 'creeLe,desc' })
      .subscribe({
        next: res => {
          this.avis.set(res.content ?? []);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set("Impossible de charger les avis en attente.");
        }
      });
  }

  approve(avis: AvisServiceDto): void {
    this.setModerating(avis.idAvis, true);
    this.avisApi.moderateAvis(avis.idAvis, { statut: 'APPROVED' }).subscribe({
      next: () => {
        this.toast.success('Avis validé');
        this.removeAvis(avis.idAvis);
        this.setModerating(avis.idAvis, false);
      },
      error: err => {
        this.toast.error('Erreur', err?.error?.message || "Impossible de valider l'avis.");
        this.setModerating(avis.idAvis, false);
      }
    });
  }

  reject(avis: AvisServiceDto): void {
    const motifRefus = (this.refusDraft[avis.idAvis] ?? '').trim();
    if (!motifRefus) {
      this.toast.error('Motif requis', 'Veuillez renseigner un motif de refus.');
      return;
    }

    this.setModerating(avis.idAvis, true);
    this.avisApi.moderateAvis(avis.idAvis, { statut: 'REJECTED', motifRefus }).subscribe({
      next: () => {
        this.toast.success('Avis refusé');
        this.removeAvis(avis.idAvis);
        delete this.refusDraft[avis.idAvis];
        this.setModerating(avis.idAvis, false);
      },
      error: err => {
        this.toast.error('Erreur', err?.error?.message || "Impossible de refuser l'avis.");
        this.setModerating(avis.idAvis, false);
      }
    });
  }

  isModerating(idAvis: number): boolean {
    return !!this.moderatingIds()[idAvis];
  }

  private setModerating(idAvis: number, value: boolean): void {
    this.moderatingIds.set({ ...this.moderatingIds(), [idAvis]: value });
  }

  private removeAvis(idAvis: number): void {
    this.avis.set(this.avis().filter(item => item.idAvis !== idAvis));
  }
}
