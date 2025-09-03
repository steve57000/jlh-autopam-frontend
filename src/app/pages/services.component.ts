// src/app/pages/services.component.ts
import {Component, OnDestroy, OnInit, Inject, PLATFORM_ID, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntil } from 'rxjs/operators';
import { Subject, firstValueFrom, Subscription } from 'rxjs';

import { ServiceCardComponent } from '../components/service-card.component';
import { CurrentQuoteComponent } from '../components/current-quote/current-quote.component';

import { ServicesService } from '../services/services.service';
import { ServiceDto } from '../modeles/service.model';
import { AuthService } from '../services/auth.service';
import { DemandesStateService } from '../services/demandes-state.service';
import { DemandesServiceService } from '../services/demandes-services.service';
import { DemandeResponse } from '../services/client-dashboard.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import {Router} from '@angular/router';

type TypeCode = 'Devis' | 'RendezVous';

@Component({
  standalone: true,
  selector: 'app-services',
  imports: [CommonModule, ServiceCardComponent, CurrentQuoteComponent],
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss']
})
export class ServicesComponent implements OnInit, OnDestroy {
  services: ServiceDto[] = [];
  draft?: DemandeResponse | null;

  private destroy$ = new Subject<void>();
  private sub?: Subscription;
  private router = inject(Router);

  // Optionnels : si tu veux créer un RDV immédiatement à la validation
  selectedCreneauId?: number | null;
  assignedAdminId?: number | null;

  constructor(
    private srv: ServicesService,
    private auth: AuthService,
    private state: DemandesStateService,
    private ds: DemandesServiceService,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  async ngOnInit() {
    this.srv.getPublicServices().subscribe(list => (this.services = list));

    if (this.isClient) {
      await this.refreshDraft();
    }

    // ✅ SSR-safe : on écoute l’event interne plutôt que `document`
    this.state.refresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refreshDraft());
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isClient(): boolean {
    return this.auth.isAuthenticated() && this.auth.getUserRole() === 'CLIENT';
  }

  trackById(_i: number, svc: ServiceDto) {
    return svc.idService as number;
  }

  /** Recharge la demande Brouillon (ou null si vide) */
  async refreshDraft() {
    try {
      const q = await this.state.loadDraft();
      const lines = Array.isArray(q?.services) ? q.services.length : 0;
      this.draft = lines > 0 ? q : null;
    } catch {
      this.draft = null;
    }
  }

  /** Retrait d’une ligne demandé depuis l’encart */
  async onRemoveLine(ev: { idDemande: number; idService: number }) {
    await firstValueFrom(this.ds.deleteLine(ev.idDemande, ev.idService));
    await this.refreshDraft();
  }

  /** Helper pour convertir une string du <select> en TypeCode (évite `as` dans le template) */
  castType(v: string): TypeCode {
    return v === 'RendezVous' ? 'RendezVous' : 'Devis';
  }

  /** Bouton "Valider ma demande" */
  async onSubmitDemand(payload: { type: TypeCode; immatriculation?: string | null }) {
    if (!this.draft?.idDemande) return;

    const id = this.draft.idDemande;
    const api = environment.apiBaseUrl;

    try {
      // 1) immat override éventuelle
      const immat = (payload.immatriculation || '').trim();
      if (immat.length > 0) {
        await firstValueFrom(
          this.http.patch<void>(`${api}/demandes/${id}/immatriculation`, { immatriculation: immat })
        );
      }

      // 2) type choisi (Devis|RendezVous)
      await firstValueFrom(
        this.http.patch<void>(`${api}/demandes/${id}/type`, { codeType: payload.type })
      );

      // 3) (Optionnel) création RDV immédiate si tu veux le faire ici
      if (payload.type === 'RendezVous' && this.selectedCreneauId && this.assignedAdminId) {
        await firstValueFrom(
          this.http.post(`${api}/rendezvous`, {
            demandeId: id,
            creneauId: this.selectedCreneauId,
            administrateurId: this.assignedAdminId,
            codeStatut: 'Confirme'
          })
        );
      }

      // 4) soumission : Brouillon -> En_attente
      await firstValueFrom(this.http.patch<void>(`${api}/demandes/${id}/submit`, {}));

      // 5) on nettoie l’état local
      this.state.resetCache();
      this.draft = null;

      // Redirection:
      await this.router.navigate(['/dashboard'], { replaceUrl: true });
    } catch (e) {
      console.error(e);
    }
  }
}
