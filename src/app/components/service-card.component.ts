// src/app/components/service-card.component.ts
import { Component, HostBinding, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FrCurrencyPipe } from '../pipes/fr-currency.pipe';
import { ServiceDto }     from '../modeles/service.model';
import { DemandesStateService } from '../services/demandes-state.service';
import { DemandesServiceService } from '../services/demandes-services.service';
import { firstValueFrom } from 'rxjs';
import { HasRoleDirective } from '../directives/has-role.directive';

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

  constructor(
    private demandeState: DemandesStateService,
    private dsSrv: DemandesServiceService
  ) {}

  @HostBinding('style.--delay') get cssDelay() { return `${this.delay}s`; }
  @HostBinding('style.animation-delay') get animationDelay() { return `var(--delay)`; }

  openConfirm() { this.dialogRef?.nativeElement.showModal(); }
  closeConfirm() { this.dialogRef?.nativeElement.close(); }

  async confirmAdd() {
    try {
      const idDemande = await this.demandeState.initDemande();
      await firstValueFrom(this.dsSrv.addUnique({
        demandeId:  idDemande,
        serviceId:  this.service.idService!,
        quantite:   this.qty
      }));
      this.closeConfirm();
      // ✅ Notifie sans 'document' (SSR-safe)
      this.demandeState.notifyRefresh();
    } catch (err: any) {
      // Contrainte d’unicité : déjà présent
      if (err?.status === 409) {
        // à toi d’afficher un toast si tu veux
      }
      this.closeConfirm();
      console.error(err);
    }
  }
}
