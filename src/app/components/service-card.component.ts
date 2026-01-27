import { Component, HostBinding, Input, ViewChild, ElementRef, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FrCurrencyPipe } from '../pipes/fr-currency.pipe';
import { ServiceDto } from '../modeles/service.model';
import { DemandesStateService } from '../services/demandes-state.service';
import { DemandesServiceService } from '../services/demandes-services.service';
import { firstValueFrom } from 'rxjs';
import { HasRoleDirective } from '../directives/has-role.directive';
import { ToastService } from '../shared/toast/toast.service';
import { AuthService } from '../services/auth.service';
import { MediaUrlService } from '../services/media-url.service';
import { AvisServicesService } from '../services/avis-services.service';
import type { AvisServiceStatsDto } from '../modeles/avis-service.model';
import { RatingStarsComponent } from '../shared/rating-stars/rating-stars.component';

@Component({
  selector: 'app-service-card',
  standalone: true,
  imports: [CommonModule, FrCurrencyPipe, HasRoleDirective, RatingStarsComponent],
  templateUrl: './service-card.component.html',
  styleUrls: ['./service-card.component.scss']
})
export class ServiceCardComponent implements OnChanges {
  @Input() service!: ServiceDto;
  @Input() delay = 0;
  @Input() showAdd = false;

  @ViewChild('confirmDialog') dialogRef?: ElementRef<HTMLDialogElement>;
  lotCount = 1;

  private demandeState = inject(DemandesStateService);
  private dsSrv        = inject(DemandesServiceService);
  private toast        = inject(ToastService);
  private auth         = inject(AuthService);
  private mediaUrl     = inject(MediaUrlService);
  private avisService  = inject(AvisServicesService);

  avisStats: AvisServiceStatsDto | null = null;
  private lastServiceId: number | null = null;

  @HostBinding('style.--delay') get cssDelay() { return `${this.delay}s`; }
  @HostBinding('style.animation-delay') get animationDelay() { return `var(--delay)`; }
  get iconUrl() { return this.mediaUrl.resolve(this.service?.iconUrl); }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['service']) {
      const serviceId = this.service?.idService ?? null;
      if (serviceId && serviceId !== this.lastServiceId) {
        this.lastServiceId = serviceId;
        this.loadAvisStats(serviceId);
      }
      if (this.isLotMode) {
        this.resetLotCount();
      }
    }
  }

  private loadAvisStats(serviceId: number) {
    this.avisService.getAvisStats(serviceId).subscribe({
      next: stats => {
        this.avisStats = stats;
      },
      error: () => {
        this.avisStats = null;
      }
    });
  }

  openConfirm() {
    if (this.isLotMode) {
      this.resetLotCount();
    }
    this.dialogRef?.nativeElement.showModal();
  }
  closeConfirm() { this.dialogRef?.nativeElement.close(); }

  get isLotMode() {
    return this.service?.quantiteMode === 'LOT' && this.lotSize > 0;
  }

  get lotSize() {
    return this.service?.tailleLot ?? 1;
  }

  get maxLots() {
    if (!this.isLotMode) {
      return null;
    }
    const max = this.service?.quantiteMax;
    if (typeof max !== 'number' || !Number.isFinite(max)) {
      return null;
    }
    return Math.max(1, Math.floor(max / this.lotSize));
  }

  get requestedQuantity() {
    if (this.isLotMode) {
      return this.lotCount * this.lotSize;
    }
    return 1;
  }

  get quantityLabel() {
    if (!this.isLotMode) {
      return 'Quantité : 1';
    }
    if (this.lotCount === 1) {
      return `1 lot de ${this.lotSize}`;
    }
    return `${this.lotCount} lots (${this.requestedQuantity} unités)`;
  }

  setLotCount(value: string) {
    const parsed = Number(value);
    let next = Number.isFinite(parsed) ? Math.floor(parsed) : 1;
    next = Math.max(1, next);
    const maxLots = this.maxLots;
    if (maxLots) {
      next = Math.min(next, maxLots);
    }
    this.lotCount = next;
  }

  private resetLotCount() {
    this.lotCount = 1;
    const maxLots = this.maxLots;
    if (maxLots && this.lotCount > maxLots) {
      this.lotCount = maxLots;
    }
  }

  async confirmAdd() {
    try {
      if (!this.auth.isAuthenticated()) {
        this.toast.info('Merci de vous connecter pour créer une demande.');
        this.closeConfirm();
        return;
      }

      // 1) crée/récupère le brouillon (attaché au CLIENT)
      const idDemande = await this.demandeState.initDemande({ silent: true });

      // 2) ajout unique (409 si déjà présent)
      await firstValueFrom(this.dsSrv.addUnique({
        demandeId:  idDemande,
        serviceId:  this.service.idService!,
        quantite:   this.requestedQuantity
      }));

      // 3) notifie l’encart et feedback UI
      this.toast.success('Service ajouté à votre demande.');
      this.demandeState.notifyRefresh();
      this.closeConfirm();
    } catch (err: any) {
      // Gestion “clean” des 403/409
      if (err?.status === 409) {
        const apiMessage = err?.error?.message;
        if (apiMessage) {
          this.toast.warning('Demande non modifiable', apiMessage);
        } else {
          this.toast.info('Ce service est déjà présent dans votre demande.');
        }
      } else if (err?.status === 400) {
        this.toast.error('Quantité maximale atteinte pour ce service.');
      } else if (err?.status === 403) {
        this.toast.error("Action non autorisée. Réessayez après connexion.");
      } else {
        this.toast.error("Impossible d'ajouter ce service pour le moment.");
      }
      this.closeConfirm();
    }
  }
}
