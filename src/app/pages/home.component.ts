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
import { catchError, forkJoin, of } from 'rxjs';

type MetiersPicto = {
  img: string;
  label: string;
  description: string;
};

// const DEFAULT_METIERS_PICTOS: MetiersPicto[] = [
//   {
//     img: '/icons/pictos-metiers/picto-metier-pneu.png',
//     label: 'Pneumatiques',
//     description: `Montage, équilibrage et réparation de pneumatiques été, hiver ou 4 saisons pour toutes marques de véhicules.`
//   },
//   {
//     img: '/icons/pictos-metiers/picto-metier-hybride.png',
//     label: 'Véhicules hybrides',
//     description: `Interventions sécurisées sur les chaînes de traction et batteries haute tension grâce à nos techniciens habilités.`
//   },
//   {
//     img: '/icons/pictos-metiers/picto-metier-geometrie.png',
//     label: 'Géométrie',
//     description: `Réglage précis du parallélisme et du carrossage pour préserver vos pneus et garantir une tenue de route optimale.`
//   },
//   {
//     img: '/icons/pictos-metiers/picto-metier-freinage.png',
//     label: 'Freinage',
//     description: `Contrôle et remplacement des plaquettes, disques et liquides afin d’assurer un freinage réactif et sécurisant.`
//   },
//   {
//     img: '/icons/pictos-metiers/picto-metier-embrayage.png',
//     label: 'Embrayage',
//     description: `Diagnostic et remplacement des embrayages, volants moteurs et butées pour une transmission souple et fiable.`
//   },
//   {
//     img: '/icons/pictos-metiers/picto-metier-echappement.png',
//     label: 'Échappement',
//     description: `Inspection, réparation et remplacement des lignes d’échappement et filtres à particules pour un moteur sain.`
//   },
//   {
//     img: '/icons/pictos-metiers/picto-metier-distribution.png',
//     label: 'Distribution',
//     description: `Remplacement de courroies ou de chaînes de distribution selon les préconisations constructeur.`
//   },
//   {
//     img: '/icons/pictos-metiers/picto-metier-climatisation.png',
//     label: 'Climatisation',
//     description: `Entretien complet du circuit : recharge, nettoyage, contrôle d’étanchéité et désinfection de l’habitacle.`
//   },
//   {
//     img: '/icons/pictos-metiers/picto-metier-amortisseur.png',
//     label: 'Amortisseurs',
//     description: `Remplacement des amortisseurs, ressorts et biellettes pour une conduite confortable et maîtrisée.`
//   },
//   {
//     img: '/icons/pictos-metiers/picto-metier-pre_controle.png',
//     label: 'Pré-contrôle technique',
//     description: `Préparation complète au contrôle technique avec diagnostic des points de sécurité et corrections nécessaires.`
//   },
//   {
//     img: '/icons/pictos-metiers/picto-metier-revision_constructeur.png',
//     label: 'Révision constructeur',
//     description: `Révisions certifiées respectant le carnet d’entretien constructeur et l’utilisation de pièces d’origine ou équivalentes.`
//   },
//   {
//     img: '/icons/pictos-metiers/picto-metier-vidange.png',
//     label: 'Vidange',
//     description: `Vidanges moteur avec huiles adaptées, remplacement des filtres et remise à zéro des indicateurs d’entretien.`
//   },
// ];

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

  @ViewChild('sectionMetiers', { static: false }) sectionMetiersRef!: ElementRef;
  @ViewChild('sectionAgrements', { static: false }) sectionAgrementsRef!: ElementRef;

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
      content: `Votre centre JLH Auto PAM est habilité à effectuer des prestations sur les véhicules hybride ! Les voitures hybrides sont similaires aux véhicules thermiques en termes de pneumatiques, d'éclairage, de système de freinage ou encore de suspensions. Néanmoins elles nécessitent une véritable habilitation pour s'assurer que les prestations sont réalisées de manière conforme et sécurisée. Les experts Point S sont formés et agréés d'une habilitation BRL ou BOL, ce qui leur permet de réaliser toute type de prestation sur votre véhicule hybride : entretien, réparation, pré-contrôle technique et interventions.`,
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
        this.loadHomeAvis(services || []);
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
  }

  ngOnDestroy() {
    this.clearMetiersSlide();
    this.clearAgrementsSlide();
    if (this.metiersObserver) this.metiersObserver.disconnect();
    if (this.agrementsObserver) this.agrementsObserver.disconnect();
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
    const targets = services.filter(svc => typeof svc.idService === 'number');
    if (!targets.length) {
      this.latestAvis = [];
      return;
    }

    this.avisLoading = true;
    this.avisError = false;

    forkJoin(
      targets.map(svc =>
        this.avisService.getAllAvisByService(svc.idService as number, {
          size: 50,
          sort: 'creeLe,desc'
        }).pipe(
          catchError(() => of([] as AvisServiceDto[]))
        )
      )
    ).subscribe({
      next: responses => {
        const merged = responses.flat();
        this.latestAvis = merged
          .slice()
          .sort((a, b) => {
            const tsA = a?.creeLe ? new Date(a.creeLe).getTime() : 0;
            const tsB = b?.creeLe ? new Date(b.creeLe).getTime() : 0;
            return tsB - tsA;
          })
          .slice(0, 6);
        this.avisLoading = false;
      },
      error: () => {
        this.latestAvis = [];
        this.avisLoading = false;
        this.avisError = true;
      }
    });
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
