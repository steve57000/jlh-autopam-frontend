import { AfterViewInit, Component, ElementRef, Inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

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
import { MetiersPictosComponent } from '../features/metiers-pictos.component';

import { BrandsComponent } from '../shared/brands/brands.component';
import { RatingStarsComponent } from '../shared/rating-stars/rating-stars.component';
import { catchError, of } from 'rxjs';

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
    DatePipe,
    RouterLink
  ]
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {

  promotions: PromotionModel[] = [];
  metiersPictos: MetiersPicto[] = [];

  latestAvis: AvisServiceDto[] = [];
  avisLoading = false;
  avisError = false;

  readonly homeAvisCount = 3;

  activeIndexAgrements = 0;

  private agrementsInterval: any = null;
  private agrementsObserver: IntersectionObserver | null = null;
  private avisObserver: IntersectionObserver | null = null;
  private avisLoadHandled = false;

  @ViewChild('sectionAgrements', { static: false }) sectionAgrementsRef!: ElementRef;
  @ViewChild('sectionAvis', { static: false }) sectionAvisRef!: ElementRef;

  constructor(
    private promoService: PromotionService,
    private servicesService: ServicesService,
    private mediaUrl: MediaUrlService,
    private avisService: AvisServicesService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  agrementsCards: { title: string; content: string; color: 'light' | 'dark' }[] = [
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
      content: `La révision est une étape essentielle pour veiller au bon entretien de votre véhicule.
       Selon les préconisations des constructeurs, elle est à faire tous les 20 000 kms.
       Chez Point S, pas de stress on s'occupe de tout ! Notre centre agréé se charge de respecter le cahier d’entretien selon les recommandations de votre constructeur.
        Dites adieu aux révisions trop coûteuses… Faites confiance à notre équipe Point S, pour la révision de votre voiture tout en préservant votre garantie constructeur !`,
      color: 'light'
    }
  ];

  ngOnInit() {
    this.promoService.getPromotions().subscribe(data => this.promotions = data || []);

    this.servicesService.getPublicServices().subscribe({
      next: services => {
        this.metiersPictos = this.buildMetiersFromServices(services || []);
        this.deferLoadHomeAvis();
      },
      error: () => {
        this.metiersPictos = [];
        this.latestAvis = [];
        this.avisError = true;
      }
    });
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.agrementsObserver = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) this.startAgrementsSlide();
        else this.clearAgrementsSlide();
      },
      { threshold: 0.4 }
    );

    if (this.sectionAgrementsRef?.nativeElement) {
      this.agrementsObserver.observe(this.sectionAgrementsRef.nativeElement);
    }

    this.setupAvisObserver();
  }

  ngOnDestroy() {
    this.clearAgrementsSlide();
    if (this.agrementsObserver) this.agrementsObserver.disconnect();
    if (this.avisObserver) this.avisObserver.disconnect();
  }

  private loadHomeAvis() {
    this.avisLoading = true;
    this.avisError = false;

    // ✅ 1 seule requête : les 3 derniers avis APPROVED tous services
    this.avisService.getApprovedAvisPage({ page: 0, size: this.homeAvisCount, sort: 'creeLe,desc' })
      .pipe(
        catchError(() => {
          this.avisError = true;
          return of({ content: [], totalElements: 0, totalPages: 0, number: 0, size: this.homeAvisCount });
        })
      )
      .subscribe(res => {
        this.latestAvis = res.content ?? [];
        this.avisLoading = false;
      });
  }

  private buildMetiersFromServices(services: ServiceDto[]): MetiersPicto[] {
    return (services || [])
      .slice()
      .sort((a, b) => (a.idService ?? 0) - (b.idService ?? 0))
      .map(service => {
        const icon = typeof service.iconUrl === 'string' ? service.iconUrl.trim() : '';
        return {
          img: this.resolveIcon(icon) || '',
          label: service.libelle,
          description: service.description ?? ''
        };
      })
      .filter(x => !!x.img);
  }

  private resolveIcon(url: string): string | null {
    return this.mediaUrl.resolve(url);
  }

  private deferLoadHomeAvis() {
    if (!isPlatformBrowser(this.platformId)) {
      this.loadHomeAvis();
      return;
    }
    this.setupAvisObserver();
  }

  private setupAvisObserver() {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.avisLoadHandled) return;

    const schedule = () => {
      if (this.avisLoadHandled) return;
      this.avisLoadHandled = true;
      this.loadHomeAvis();
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
      (window as any).requestIdleCallback(schedule, { timeout: 5000 });
    }

    setTimeout(schedule, 4000);
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
