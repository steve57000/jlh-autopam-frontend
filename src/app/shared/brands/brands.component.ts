import {CommonModule, NgOptimizedImage} from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  HostListener,
  OnDestroy,
} from '@angular/core';
import {
  trigger, transition, style, animate, query, stagger,
} from '@angular/animations';

type Brand = {
  name: string;
  src: string;
  alt?: string;
  srcset?: string;
  sizes?: string;
  width?: number;
  height?: number;
};

@Component({
  selector: 'app-brands',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage],
  templateUrl: './brands.component.html',
  styleUrls: ['./brands.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('listStagger', [
      transition(':enter', [
        query('.brand-item', [
          style({ opacity: 0, transform: 'translateY(8px)' }),
          stagger(80, animate('400ms ease-out', style({ opacity: 1, transform: 'none' }))),
        ], { optional: true })
      ])
    ])
  ]
})
export class BrandsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('rail', { static: true }) rail!: ElementRef<HTMLDivElement>;

  // Images en frontend (assets)
  brands: Brand[] = [
    { name: 'Gates', src: 'assets/brands/gates.svg' },
    { name: 'Goodyear', src: 'assets/brands/goodyear.svg' },
    { name: 'Bosch', src: 'assets/brands/bosch.svg' },
    { name: 'Kumho Tyres', src: 'assets/brands/kumho-tyres.svg' },
    { name: 'Dunlop', src: 'assets/brands/dunlop.svg' },
    { name: 'Kleber', src: 'assets/brands/kleber.svg' },
    { name: 'Moog', src: 'assets/brands/moog.svg' },
    { name: 'Filtres Purflux', src: 'assets/brands/purflux.svg' },
    {
      name: 'Total Lubrifiants',
      src: 'assets/brands/total-220.webp',
      srcset: 'assets/brands/total-220.webp 220w, assets/brands/total-300.webp 300w',
      sizes: '(max-width: 768px) 180px, 214px',
      width: 220,
      height: 123,
    },
    { name: 'Yacco', src: 'assets/brands/yacco.svg' },
    { name: 'LUK', src: 'assets/brands/luk.svg' },
    { name: 'febi bilstein', src: 'assets/brands/febi-bilstein.svg' },
  ];

  canScrollLeft = false;
  canScrollRight = false;
  private scrollStep = 0;
  private pendingArrowUpdate = false;
  private resizeObserver?: ResizeObserver;
  private readonly onScroll = () => this.scheduleArrowUpdate();

  ngAfterViewInit() {
    this.computeScrollStep();
    this.updateArrows();
    // Sur mobile, animations déjà gérées par trigger ; ici on suit le scroll
    this.rail.nativeElement.addEventListener('scroll', this.onScroll, { passive: true });
    this.resizeObserver = new ResizeObserver(() => {
      this.computeScrollStep();
      this.scheduleArrowUpdate();
    });
    this.resizeObserver.observe(this.rail.nativeElement);
    // Petit délai pour calculs après paint
    setTimeout(() => this.scheduleArrowUpdate(), 0);
  }

  ngOnDestroy() {
    this.rail.nativeElement.removeEventListener('scroll', this.onScroll);
    this.resizeObserver?.disconnect();
  }

  @HostListener('window:resize')
  onResize() {
    this.computeScrollStep();
    this.scheduleArrowUpdate();
  }

  private scheduleArrowUpdate() {
    if (this.pendingArrowUpdate) return;
    this.pendingArrowUpdate = true;
    requestAnimationFrame(() => {
      this.pendingArrowUpdate = false;
      this.updateArrows();
    });
  }

  private computeScrollStep() {
    const el = this.rail?.nativeElement;
    if (!el) return;
    const item = el.querySelector<HTMLElement>('.brand-item');
    if (item) {
      const styles = getComputedStyle(item);
      const marginRight = parseFloat(styles.marginRight || '0');
      this.scrollStep = item.clientWidth + marginRight;
    } else {
      this.scrollStep = el.clientWidth * 0.8;
    }
  }

  private updateArrows() {
    const el = this.rail?.nativeElement;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    this.canScrollLeft = el.scrollLeft > 0;
    this.canScrollRight = el.scrollLeft < (maxScrollLeft - 1);
  }

  scroll(direction: 'left' | 'right') {
    const el = this.rail.nativeElement;
    if (!this.scrollStep) {
      this.computeScrollStep();
    }
    const step = this.scrollStep || el.clientWidth * 0.8;
    const delta = direction === 'left' ? -step : step;
    el.scrollBy({ left: delta, behavior: 'smooth' });
    // Mise à jour optimiste
    this.scheduleArrowUpdate();
  }

  trackByName = (_: number, b: Brand) => b.name;
}
