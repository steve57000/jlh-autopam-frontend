import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { PromotionService } from '../services/promotion.service';
import { ServicesService } from '../services/services.service';

import { PromotionModel } from '../modeles/promotion.model';
import { ServiceDto } from '../modeles/service.model';

import { PromotionsSliderComponent } from '../features/promotions-slider.component';
import { IntroAccueilComponent } from '../features/intro-accueil.component';
import { SectionCarousselComponent } from '../features/section-caroussel.component';
import {MetiersPictosComponent} from '../features/metiers-pictos.component';

import { BrandsComponent } from '../shared/brands/brands.component';

type MetiersPicto = {
  img: string;
  label: string;
  description: string;
};

const DEFAULT_METIERS_PICTOS: MetiersPicto[] = [
  {
    img: 'assets/icons/picto-metier-pneu.png',
    label: 'Pneumatiques',
    description: `Montage, équilibrage et réparation de pneumatiques été, hiver ou 4 saisons pour toutes marques de véhicules.`
  },
  {
    img: 'assets/icons/picto-metier-hybride.png',
    label: 'Véhicules hybrides',
    description: `Interventions sécurisées sur les chaînes de traction et batteries haute tension grâce à nos techniciens habilités.`
  },
  {
    img: 'assets/icons/picto-metier-geometrie.png',
    label: 'Géométrie',
    description: `Réglage précis du parallélisme et du carrossage pour préserver vos pneus et garantir une tenue de route optimale.`
  },
  {
    img: 'assets/icons/picto-metier-freinage.png',
    label: 'Freinage',
    description: `Contrôle et remplacement des plaquettes, disques et liquides afin d’assurer un freinage réactif et sécurisant.`
  },
  {
    img: 'assets/icons/picto-metier-embrayage.png',
    label: 'Embrayage',
    description: `Diagnostic et remplacement des embrayages, volants moteurs et butées pour une transmission souple et fiable.`
  },
  {
    img: 'assets/icons/picto-metier-echappement.png',
    label: 'Échappement',
    description: `Inspection, réparation et remplacement des lignes d’échappement et filtres à particules pour un moteur sain.`
  },
  {
    img: 'assets/icons/picto-metier-distribution.png',
    label: 'Distribution',
    description: `Remplacement de courroies ou de chaînes de distribution selon les préconisations constructeur.`
  },
  {
    img: 'assets/icons/picto-metier-climatisation.png',
    label: 'Climatisation',
    description: `Entretien complet du circuit : recharge, nettoyage, contrôle d’étanchéité et désinfection de l’habitacle.`
  },
  {
    img: 'assets/icons/picto-metier-amortisseur.png',
    label: 'Amortisseurs',
    description: `Remplacement des amortisseurs, ressorts et biellettes pour une conduite confortable et maîtrisée.`
  },
  {
    img: 'assets/icons/picto-metier-pre_controle.png',
    label: 'Pré-contrôle technique',
    description: `Préparation complète au contrôle technique avec diagnostic des points de sécurité et corrections nécessaires.`
  },
  {
    img: 'assets/icons/picto-metier-revision_constructeur.png',
    label: 'Révision constructeur',
    description: `Révisions certifiées respectant le carnet d’entretien constructeur et l’utilisation de pièces d’origine ou équivalentes.`
  },
  {
    img: 'assets/icons/picto-metier-vidange.png',
    label: 'Vidange',
    description: `Vidanges moteur avec huiles adaptées, remplacement des filtres et remise à zéro des indicateurs d’entretien.`
  },
];

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
    BrandsComponent
  ]
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {

  promotions: PromotionModel[] = [];

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

  metiersCards: { title: string; content: string; color: "light" | "dark" }[] = [
    {
      title: 'ENTRETIEN',
      content: `Votre centre entretien JLH Auto Pam offre un service complet pour l’entretien et la réparation de véhicules.Nous proposons des services variés, tels que révisions, vidanges, changements de pneus, diagnostics de moteur, réparations de freins et suspension, et contrôles de géométrie.
      Les clients bénéficient de techniciens qualifiés, d’outils modernes, d’un excellent rapport qualité-prix et d’un service personnalisé.`,
      color: 'dark'
    },
    {
      title: 'VITRAGE',
      content: `Un impact, une fissure ? Pas de stress, JLH Auto Pam s’engage à changer ou réparer votre pare-brise. Nous offrons une large gamme de services de vitrage,
      utilisant des fournisseurs de qualité  pour des résultats fiables et durables.
      Nos techniciens expérimentés, équipés des derniers outils, assurent une installation rapide et efficace, avec une garantie de qualité pour votre tranquillité d’esprit.`,
      color: 'dark'
    }
  ];

  metiersPictos: MetiersPicto[] = [];


  ngOnInit() {
    this.promoService.getPromotions().subscribe(data => this.promotions = data || []);
    this.servicesService.getPublicServices().subscribe({
      next: services => {
        const fromServices = this.buildMetiersFromServices(services || []);
        this.metiersPictos = fromServices.length > 0 ? fromServices : [...DEFAULT_METIERS_PICTOS];
      },
      error: () => {
        this.metiersPictos = [...DEFAULT_METIERS_PICTOS];
      }
    });
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return; // <-- Empêche le code côté serveur

    // Observer métiers
    this.metiersObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          this.startMetiersSlide();
        } else {
          this.clearMetiersSlide();
        }
      },
      { threshold: 0.4 }
    );
    if (this.sectionMetiersRef?.nativeElement) {
      this.metiersObserver.observe(this.sectionMetiersRef.nativeElement);
    }

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

  startMetiersSlide() {
    if (!this.metiersInterval) {
      this.metiersInterval = setInterval(() => {
        this.activeIndexMetiers = (this.activeIndexMetiers + 1) % this.metiersCards.length;
      }, 8000);
    }
  }

  private buildMetiersFromServices(services: ServiceDto[]): MetiersPicto[] {
    const sorted = services
      .slice()
      .sort((a, b) => (a.idService ?? 0) - (b.idService ?? 0));

    return sorted.map((service, index) => {
      const icon = typeof service.icon === 'string' ? service.icon.trim() : '';
      const fallbackIcon = DEFAULT_METIERS_PICTOS[index % DEFAULT_METIERS_PICTOS.length]?.img;
      return {
        img: icon || fallbackIcon,
        label: service.libelle,
        description: service.description ?? ''
      };
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
