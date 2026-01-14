import { Component, HostBinding, Input, ViewChild, ElementRef, inject } from '@angular/core';
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

@Component({
  selector: 'app-service-card',
  standalone: true,
  imports: [CommonModule, FrCurrencyPipe, HasRoleDirective],
  templateUrl: './service-card.component.html',
  styleUrls: ['./service-card.component.scss']
})
export class ServiceCardComponent {
  @Input() service!: ServiceDto;
  @Input() delay = 0;
  @Input() showAdd = false;

  @ViewChild('confirmDialog') dialogRef?: ElementRef<HTMLDialogElement>;
  private readonly qty = 1;

  private demandeState = inject(DemandesStateService);
  private dsSrv        = inject(DemandesServiceService);
  private toast        = inject(ToastService);
  private auth         = inject(AuthService);
  private mediaUrl     = inject(MediaUrlService);

  @HostBinding('style.--delay') get cssDelay() { return `${this.delay}s`; }
  @HostBinding('style.animation-delay') get animationDelay() { return `var(--delay)`; }
  get iconUrl() { return this.mediaUrl.resolve(this.service?.iconUrl); }

  openConfirm() { this.dialogRef?.nativeElement.showModal(); }
  closeConfirm() { this.dialogRef?.nativeElement.close(); }

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
        quantite:   this.qty
      }));

      // 3) notifie l’encart et feedback UI
      this.toast.success('Service ajouté à votre demande.');
      this.demandeState.notifyRefresh();
      this.closeConfirm();
    } catch (err: any) {
      // Gestion “clean” des 403/409
      if (err?.status === 409) {
        this.toast.info('Ce service est déjà présent dans votre demande.');
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
