import {Component, OnDestroy, OnInit, Inject, PLATFORM_ID, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntil } from 'rxjs/operators';
import { Subject, firstValueFrom, Subscription } from 'rxjs';

import { ServiceCardComponent } from '../components/service-card.component';
import { CurrentQuoteComponent, type TypeCode } from '../components/current-quote/current-quote.component';

import { ServicesService } from '../services/services.service';
import { ServiceDto } from '../modeles/service.model';
import { AuthService } from '../services/auth.service';
import { DemandesStateService } from '../services/demandes-state.service';
import { DemandesServiceService } from '../services/demandes-services.service';
import { DemandeResponse } from '../services/client-dashboard.service';
import { ToastService} from '../shared/toast/toast.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import {Router} from '@angular/router';

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

  selectedCreneauId?: number | null;
  assignedAdminId?: number | null;

  constructor(
    private srv: ServicesService,
    private auth: AuthService,
    private state: DemandesStateService,
    private ds: DemandesServiceService,
    private http: HttpClient,
    private toast: ToastService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  async ngOnInit() {
    this.srv.getPublicServices().subscribe(list => (this.services = list));

    if (this.isClient) {
      await this.refreshDraft();
    }

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

  async refreshDraft() {
    try {
      const q = await this.state.loadDraft({ silent: true });
      const lines = Array.isArray(q?.services) ? q.services.length : 0;
      this.draft = lines > 0 ? q : null;
    } catch {
      this.draft = null;
    }
  }

  async onRemoveLine(ev: { idDemande: number; idService: number }) {
    try {
      await firstValueFrom(this.ds.deleteLine(ev.idDemande, ev.idService));
      await this.refreshDraft();

      if (!this.draft) {
        // Plus aucune ligne → on repart à zéro côté front
        this.state.resetCache();
        this.state.notifyRefresh();
      }

      this.toast.info('Ligne retirée de votre demande');
    } catch {
      this.toast.error('Impossible de retirer ce service pour le moment.');
    }
  }

  castType(v: string): TypeCode {
    if (v === 'RendezVous' || v === 'Service') {
      return v;
    }
    return 'Devis';
  }

  async onSubmitDemand(payload: { type: TypeCode; immatriculation?: string | null }) {
    if (!this.draft?.idDemande) return;

    const id = this.draft.idDemande;
    const api = environment.apiBaseUrl;
    const skipErrorOptions = { headers: new HttpHeaders({ 'X-Skip-Error-Toast': '1' }) };

    const fallback: { codeType?: TypeCode; immatriculation?: string | null } = {};

    const immat = (payload.immatriculation || '').trim();
    try {
      if (immat.length > 0) {
        try {
          await firstValueFrom(
            this.http.patch<void>(
              `${api}/demandes/${id}/immatriculation`,
              { immatriculation: immat },
              skipErrorOptions
            )
          );
        } catch {
          fallback.immatriculation = immat;
        }
      }

      try {
        await firstValueFrom(
          this.http.patch<void>(
            `${api}/demandes/${id}/type`,
            { codeType: payload.type },
            skipErrorOptions
          )
        );
      } catch {
        fallback.codeType = payload.type;
      }

      if (fallback.codeType || 'immatriculation' in fallback) {
        const services = (this.draft?.services ?? []).map(s => ({
          idService: s.idService,
          quantite: s.quantite,
          prixUnitaire: s.prixUnitaire ?? null,
        }));
        const hasServices = services.length > 0;

        try {
          await firstValueFrom(
            this.ds.updateDemande(
              id,
              {
                ...(fallback.codeType ? { codeType: fallback.codeType } : {}),
                ...('immatriculation' in fallback ? { immatriculation: fallback.immatriculation ?? null } : {}),
                ...(hasServices ? { services } : {}),
              },
              { silentError: true }
            )
          );
        } catch (updateErr) {
          console.warn('Demande fallback update failed, proceeding with submit', updateErr);
        }
      }

      if (payload.type === 'RendezVous' && this.selectedCreneauId && this.assignedAdminId) {
        await firstValueFrom(
          this.http.post(`${api}/rendezvous`, {
            demandeId: id,
            creneauId: this.selectedCreneauId,
            administrateurId: this.assignedAdminId,
            codeStatut: 'Confirme'
          }, skipErrorOptions)
        );
      }

      await firstValueFrom(
        this.http.patch<void>(`${api}/demandes/${id}/submit`, {}, skipErrorOptions)
      );
    } catch (e: any) {
      const msg = e?.error?.message || e?.message || 'Envoi impossible';
      this.toast.error('Échec de l’envoi', msg);
      await this.refreshDraft();
      return;
    }

    this.toast.success('Demande envoyée avec succès !');

    this.state.resetCache();
    this.draft = null;

    try {
      await this.router.navigate(['/dashboard'], { replaceUrl: true });
    } catch (navErr) {
      console.warn('Navigation after demande submission failed', navErr);
    }
  }
}
