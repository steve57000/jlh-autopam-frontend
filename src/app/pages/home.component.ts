import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';

import { PromotionService } from '../services/promotion.service';
import { ServicesService } from '../services/services.service';
import { MediaUrlService } from '../services/media-url.service';
import { AvisServicesService } from '../services/avis-services.service';

import { PromotionModel } from '../modeles/promotion.model';
import { ServiceDto } from '../modeles/service.model';
import type { AvisServiceDto } from '../modeles/avis-service.model';

import { PromotionsSliderComponent } from '../features/promotions-slider.component';
import { IntroAccueilComponent } from '../features/intro-accueil.component';
import { SectionCarousselComponent } from '../features/section-caroussel.component';
import {MetiersPictosComponent} from '../features/metiers-pictos.component';

import { BrandsComponent } from '../shared/brands/brands.component';
import { RatingStarsComponent } from '../shared/rating-stars/rating-stars.component';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';

type MetiersPicto = {
  img: string;
  label: string;
  description: string;
};

@Component({
  selector: 'app-home',
  templateUrl: 'home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [
    PromotionsSliderComponent,
    IntroAccueilComponent,
    SectionCarousselComponent,
    MetiersPictosComponent,
    BrandsComponent,
    RatingStarsComponent,
    DatePipe
  ]
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {

  promotions: PromotionModel[] = [];
  latestAvis: AvisServiceDto[] = [];
  avisLoading = false;
  avisError = false;

  activeIndexMetiers = 0;
  activeIndexAgrements = 0;

  private metiersInterval: any = null;
  private agrementsInterval: any = null;
  private metiersObserver: IntersectionObserver | null = null;
  private agrementsObserver: IntersectionObserver | null = null;
  private avisObserver: IntersectionObserver | null = null;
  private avisLoadHandled = false;
  private pendingAvisServices: ServiceDto[] | null = null;

  @ViewChild('sectionMetiers', { static: false }) sectionMetiersRef!: ElementRef;
  @ViewChild('sectionAgrements', { static: false }) sectionAgrementsRef!: ElementRef;
  @ViewChild('sectionAvis', { static: false }) sectionAvisRef!: ElementRef;

  constructor(
    private promoService: PromotionService,
    private servicesService: ServicesService,
    private mediaUrl: MediaUrlService,
    private avisService: AvisServicesService,
    @Inject(PLATFORM_ID) private platformId: Object // <-- pour SSR
  ) {}

  agrementsCards: { title: string; content: string; color: "light" | "dark" }[] = [
    {
      title: 'HYBRIDE',
      content: `Votre centre JLH Auto PAM est habilité à effectuer des prestations sur les véhicules hybride !
       Les voitures hybrides sont similaires aux véhicules thermiques en termes de pneumatiques, d'éclairage,
      de système de freinage ou encore de suspensions. Néanmoins elles nécessitent une véritable habilitation
      pour s'assurer que les prestations sont réalisées de manière conforme et sécurisée. Les experts JLH AUTO PAM sont formés et agréés d'une habilitation BRL ou BOL,
      ce qui leur permet de réaliser toute type de prestation sur votre véhicule hybride : entretien, réparation, pré-contrôle technique et interventions.`,
      color: 'light'
    },
    {
      title: 'RÉVISION CONSTRUCTEUR',
      content: `  La révision est une étape essentielle pour veiller au bon entretien de votre véhicule.
       Selon les préconisations des constructeurs, elle est à faire tous les 20 000 kms.
       Chez Point S, pas de stress on s'occupe de tout ! Notre centre agréé se charge de respecter le cahier d’entretien selon les recommandations de votre constructeur.
        Dites adieu aux révisions trop coûteuses… Faites confiance à notre équipe Point S, pour la révision de votre voiture tout en préservant votre garantie constructeur !`,
      color: 'light'
    }
  ];

  metiersPictos: MetiersPicto[] = [];


  ngOnInit() {
    this.promoService.getPromotions().subscribe(data => this.promotions = data || []);
    this.servicesService.getPublicServices().subscribe({
      next: services => {
        const fromServices = this.buildMetiersFromServices(services || []);
        this.metiersPictos = fromServices.length > 0 ? fromServices : this.getDefaultMetiersPictos();
        this.deferLoadHomeAvis(services || []);
      },
      error: () => {
        this.metiersPictos = this.getDefaultMetiersPictos();
        this.latestAvis = [];
        this.avisError = true;
      }
    });
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return; // <-- Empêche le code côté serveur
    if (!this.canAutoRotateAgrements()) return;

    // Observer agréments
    this.agrementsObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          this.startAgrementsSlide();
        } else {
          this.clearAgrementsSlide();
        }
      },
      { threshold: 0.4 }
    );
    if (this.sectionAgrementsRef?.nativeElement) {
      this.agrementsObserver.observe(this.sectionAgrementsRef.nativeElement);
    }

    if (this.pendingAvisServices) {
      this.setupAvisObserver(this.pendingAvisServices);
    }
  }

  ngOnDestroy() {
    this.clearMetiersSlide();
    this.clearAgrementsSlide();
    if (this.metiersObserver) this.metiersObserver.disconnect();
    if (this.agrementsObserver) this.agrementsObserver.disconnect();
    if (this.avisObserver) this.avisObserver.disconnect();
  }

  private buildMetiersFromServices(services: ServiceDto[]): MetiersPicto[] {
    const sorted = services
      .slice()
      .sort((a, b) => (a.idService ?? 0) - (b.idService ?? 0));

    const defaults = this.getDefaultMetiersPictos();

    return sorted.map((service, index) => {
      const icon = typeof service.iconUrl === 'string' ? service.iconUrl.trim() : '';
      const fallbackIcon = defaults[index % defaults.length]?.img;
      return {
        img: this.resolveIcon(icon) || fallbackIcon,
        label: service.libelle,
        description: service.description ?? ''
      };
    });
  }

  private getDefaultMetiersPictos(): MetiersPicto[] {
    return this.metiersPictos.map(item => ({
      ...item,
      img: this.resolveIcon(item.img) || item.img
    }));
  }

  private resolveIcon(url: string): string | null {
    return this.mediaUrl.resolve(url);
  }

  private loadHomeAvis(services: ServiceDto[]) {
    const candidates = services
      .filter(svc => svc.idService !== null && svc.idService !== undefined && !Number.isNaN(Number(svc.idService)))
      .slice(0, 4);
    if (!candidates.length) {
      this.latestAvis = [];
      this.avisLoading = false;
      return;
    }

    this.avisLoading = true;
    this.avisError = false;

    const minAvis = 3;
    const maxAvis = 6;
    const pageSize = 3;
    const primaryServiceCount = 3;

    let hadError = false;
    const fetchAvisForServices = (servicesToFetch: ServiceDto[]) => forkJoin(
      servicesToFetch.map(candidate =>
        this.avisService.getAvisByService(Number(candidate.idService), {
          page: 0,
          size: pageSize,
          sort: 'creeLe,desc'
        }).pipe(
          map(response => (Array.isArray(response) ? response : response.content ?? [])),
          catchError(() => {
            hadError = true;
            return of([] as AvisServiceDto[]);
          })
        )
      )
    ).pipe(map(avisGroups => avisGroups.flat()));

    const primaryServices = candidates.slice(0, primaryServiceCount);
    const fallbackServices = candidates.slice(primaryServiceCount, primaryServiceCount + 1);

    fetchAvisForServices(primaryServices).pipe(
      switchMap(primaryAvis => {
        if (primaryAvis.length >= minAvis || !fallbackServices.length) {
          return of(primaryAvis);
        }
        return fetchAvisForServices(fallbackServices).pipe(
          map(extraAvis => primaryAvis.concat(extraAvis))
        );
      })
    ).subscribe({
      next: collected => {
        this.latestAvis = collected
          .slice()
          .sort((a, b) => {
            const tsA = a?.creeLe ? new Date(a.creeLe).getTime() : 0;
            const tsB = b?.creeLe ? new Date(b.creeLe).getTime() : 0;
            return tsB - tsA;
          })
          .slice(0, maxAvis);
        this.avisLoading = false;
        this.avisError = hadError;
      },
      error: () => {
        this.latestAvis = [];
        this.avisLoading = false;
        this.avisError = true;
      }
    });
  }

  private canAutoRotateAgrements(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    if (window.matchMedia('(max-width: 768px)').matches) return false;
    return true;
  }

  private deferLoadHomeAvis(services: ServiceDto[]) {
    if (!isPlatformBrowser(this.platformId)) {
      this.loadHomeAvis(services);
      return;
    }

    this.pendingAvisServices = services;
    this.setupAvisObserver(services);
  }

  private setupAvisObserver(services: ServiceDto[]) {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.avisLoadHandled) return;

    const schedule = () => {
      if (this.avisLoadHandled) return;
      this.avisLoadHandled = true;
      this.loadHomeAvis(services);
    };

    if (this.avisObserver) {
      this.avisObserver.disconnect();
      this.avisObserver = null;
    }

    if (this.sectionAvisRef?.nativeElement) {
      this.avisObserver = new IntersectionObserver(
        entries => {
          if (entries[0]?.isIntersecting) {
            schedule();
            this.avisObserver?.disconnect();
            this.avisObserver = null;
          }
        },
        { rootMargin: '200px 0px', threshold: 0.2 }
      );
      this.avisObserver.observe(this.sectionAvisRef.nativeElement);
    }

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(schedule, { timeout: 5000 });
    }

    setTimeout(schedule, 4000);
  }
  clearMetiersSlide() {
    if (this.metiersInterval) {
      clearInterval(this.metiersInterval);
      this.metiersInterval = null;
    }
  }
  startAgrementsSlide() {
    if (!this.agrementsInterval) {
      this.agrementsInterval = setInterval(() => {
        this.activeIndexAgrements = (this.activeIndexAgrements + 1) % this.agrementsCards.length;
      }, 8000);
    }
  }
  clearAgrementsSlide() {
    if (this.agrementsInterval) {
      clearInterval(this.agrementsInterval);
      this.agrementsInterval = null;
    }
  }
}
