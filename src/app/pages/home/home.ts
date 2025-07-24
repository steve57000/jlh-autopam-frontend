import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Promotion } from '../../services/promotion';
import { PromotionModel } from '../../modeles/promotion.model';
import { PromotionsSlider } from '../../features/promotions-slider/promotions-slider';
import { IntroAccueil } from '../../features/intro-accueil/intro-accueil';
import { SectionCaroussel } from '../../features/section-caroussel/section-caroussel';
import {MetiersPictos} from '../../features/metiers-pictos/metiers-pictos';

@Component({
  selector: 'app-home',
  templateUrl: 'home.html',
  styleUrls: ['./home.scss'],
  standalone: true,
  imports: [
    PromotionsSlider,
    IntroAccueil,
    SectionCaroussel,
    MetiersPictos
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
    private promoService: Promotion,
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

  metiersPictos = [
    { img: 'assets/icons/picto-metier-pneu.png', label: 'Pneumatiques' },
    { img: 'assets/icons/picto-metier-parebrise.png', label: 'Pare-brise' },
    { img: 'assets/icons/picto-metier-hybride.png', label: 'Véhicules hybrides' },
    { img: 'assets/icons/picto-metier-geometrie.png', label: 'Géométrie' },
    { img: 'assets/icons/picto-metier-freinage.png', label: 'Freinage' },
    { img: 'assets/icons/picto-metier-embrayage.png', label: 'Embrayage' },
    { img: 'assets/icons/picto-metier-echappement.png', label: 'Échappement' },
    { img: 'assets/icons/picto-metier-distribution.png', label: 'Distribution' },
    { img: 'assets/icons/picto-metier-climatisation.png', label: 'Climatisation' },
    { img: 'assets/icons/picto-metier-amortisseur.png', label: 'Amortisseurs' },

    { img: 'assets/icons/picto-metier-pre_controle.png', label: 'Pré-controle technique' },
    { img: 'assets/icons/picto-metier-revision_constructeur.png', label: 'Révision constructeur' },
    { img: 'assets/icons/picto-metier-vidange.png', label: 'Vidange' },
  ];


  ngOnInit() {
    this.promoService.getPromotions().subscribe(data => this.promotions = data || []);
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
