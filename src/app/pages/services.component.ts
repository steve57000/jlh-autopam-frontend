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
import { Router, RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-services',
  imports: [CommonModule, RouterModule, ServiceCardComponent, CurrentQuoteComponent],
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss']
})
export class ServicesComponent implements OnInit, OnDestroy {
  services: ServiceDto[] = [];
  draft?: DemandeResponse | null;
  activeTab = 'services';
  tabs = [
    {
      id: 'services',
      label: 'Nos services',
      title: 'Nos services',
      description:
        'Découvrez l’ensemble de nos prestations et trouvez rapidement la solution adaptée à votre véhicule.',
      anchor: '#services-list',
      cta: 'Accéder aux services'
    },
    {
      id: 'entretien',
      label: 'Entretien & révision',
      title: 'Entretien & révision constructeur',
      description:
        'Révisions complètes, contrôles de sécurité et mise à jour du carnet d’entretien digital, tout en respectant les préconisations constructeurs.',
      link: '/services/entretien',
      cta: 'Voir la fiche entretien'
    },
    {
      id: 'mecanique',
      label: 'Mécanique générale',
      title: 'Mécanique générale',
      description:
        'Réparations lourdes, distribution, transmission et motorisation : nos techniciens couvrent toutes les opérations mécaniques complexes.',
      link: '/services/mecanique',
      cta: 'Voir la fiche mécanique'
    },
    {
      id: 'pneumatiques',
      label: 'Pneumatiques & géométrie',
      title: 'Pneumatiques & géométrie',
      description:
        'Conseil sur vos pneus, montage rapide, équilibrage et géométrie 3D pour assurer tenue de route et sécurité.',
      link: '/services/pneumatiques',
      cta: 'Voir la fiche pneumatiques'
    },
    {
      id: 'diagnostic',
      label: 'Diagnostic électronique',
      title: 'Diagnostic électronique',
      description:
        'Diagnostic multimarque, calibrations ADAS et mises à jour logicielles pour détecter et résoudre rapidement les anomalies.',
      link: '/services/diagnostic',
      cta: 'Voir la fiche diagnostic'
    }
  ];

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

  setActiveTab(tabId: string) {
    this.activeTab = tabId;
  }

  async refreshDraft() {
    try {
      const q = await this.state.loadDraft({ silent: true });
      this.draft = q ?? null;
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
    if (v === 'RendezVous' || v === 'Service' || v === 'Devis') {
      return v;
    }
    return 'RendezVous';
  }

  async onSubmitDemand(payload: {
    type: TypeCode;
    immatriculation?: string | null;
    telephone?: string | null;
    rendezVousCommentaire?: string | null;
    validationPrix?: boolean;
  }) {
    if (!this.draft?.idDemande) return;

    const id = this.draft.idDemande;
    const api = environment.apiBaseUrl;
    const skipErrorOptions = { headers: new HttpHeaders({ 'X-Skip-Error-Toast': '1' }) };

    const fallback: { codeType?: TypeCode; immatriculation?: string | null; telephone?: string | null } = {};

    const immat = (payload.immatriculation || '').trim();
    const telephone = (payload.telephone || '').trim();
    try {
      const clientPatch: { immatriculation?: string | null; telephone?: string | null } = {};
      if (payload.immatriculation !== undefined) {
        clientPatch.immatriculation = immat.length > 0 ? immat : null;
      }
      if (payload.telephone !== undefined) {
        clientPatch.telephone = telephone.length > 0 ? telephone : null;
      }
      if (Object.keys(clientPatch).length > 0) {
        try {
          await firstValueFrom(
            this.http.patch<void>(
              `${api}/demandes/${id}/client`,
              clientPatch,
              skipErrorOptions
            )
          );
        } catch {
          if (payload.immatriculation !== undefined) {
            fallback.immatriculation = immat.length > 0 ? immat : null;
          }
          if (payload.telephone !== undefined) {
            fallback.telephone = telephone.length > 0 ? telephone : null;
          }
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

      if (fallback.codeType || 'immatriculation' in fallback || 'telephone' in fallback) {
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
                ...('telephone' in fallback ? { telephone: fallback.telephone ?? null } : {}),
                ...(hasServices ? { services } : {}),
              },
              { silentError: true }
            )
          );
        } catch (updateErr) {
          console.warn('Demande fallback update failed, proceeding with submit', updateErr);
        }
      }

      const commentaire = payload.rendezVousCommentaire?.trim() || null;
      const needsValidation = payload.type === 'Service' || payload.type === 'Devis';
      if (needsValidation && !payload.validationPrix) {
        this.toast.error('Validation du prix requise avant la planification.');
        return;
      }
      if (needsValidation) {
        const montantValide = (this.draft?.services ?? [])
          .reduce((sum, line) => sum + (line.prixUnitaire || 0) * (line.quantite || 0), 0);
        await firstValueFrom(
          this.http.post(
            `${api}/demandes/${id}/timeline/validation-prix`,
            {
              type: 'MONTANT',
              montantValide,
              commentaire: 'Prix validé par le client.'
            },
            skipErrorOptions
          )
        );
      }

      if (
        payload.type === 'RendezVous' &&
        this.selectedCreneauId &&
        this.assignedAdminId
      ) {
        await firstValueFrom(
          this.http.post(`${api}/rendezvous`, {
            demandeId: id,
            creneauId: this.selectedCreneauId,
            administrateurId: this.assignedAdminId,
            codeStatut: 'Confirme',
            commentaire
          }, skipErrorOptions)
        );
      }

      if (
        payload.type === 'Service' &&
        this.selectedCreneauId &&
        this.assignedAdminId
      ) {
        const serviceId = this.draft?.services?.[0]?.idService;
        if (!serviceId) {
          throw new Error('Service introuvable pour la planification.');
        }
        await firstValueFrom(
          this.http.post(`${api}/services/${serviceId}/rendezvous`, {
            demandeId: id,
            creneauId: this.selectedCreneauId,
            administrateurId: this.assignedAdminId,
            codeStatut: 'Confirme',
            commentaire
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
