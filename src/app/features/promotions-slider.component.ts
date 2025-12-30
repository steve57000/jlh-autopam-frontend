import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, Inject, PLATFORM_ID } from '@angular/core';
import { PromotionModel } from '../modeles/promotion.model';
import { DatePipe, NgOptimizedImage, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-promotions-slider',
  templateUrl: './promotions-slider.component.html',
  styleUrls: ['./promotions-slider.component.scss'],
  imports: [
    DatePipe,
    NgOptimizedImage,
    MatIconModule
  ],
  standalone: true
})
export class PromotionsSliderComponent implements OnInit, OnDestroy, OnChanges {
  @Input() promotions: PromotionModel[] = [];
  currentIndex = 0;
  autoSlideInterval: ReturnType<typeof setInterval> | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    this.handlePromotionsChange(this.promotions);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['promotions']) {
      this.handlePromotionsChange(changes['promotions'].currentValue || []);
    }
  }

  ngOnDestroy() {
    this.stopAutoSlide();
  }

  next() {
    if (!this.promotions?.length) {
      return;
    }

    this.currentIndex = (this.currentIndex + 1) % this.promotions.length;
  }

  prev() {
    if (!this.promotions?.length) {
      return;
    }

    this.currentIndex = (this.currentIndex - 1 + this.promotions.length) % this.promotions.length;
  }

  goTo(index: number) {
    if (!this.promotions?.length) {
      return;
    }

    this.currentIndex = Math.max(0, Math.min(index, this.promotions.length - 1));
  }

  getImageUrl(imageUrl: string): string {
    if (!imageUrl) {
      return '';
    }

    if (/^(data:|blob:)/i.test(imageUrl)) {
      return imageUrl;
    }

    if (/^https?:/i.test(imageUrl)) {
      try {
        const parsed = new URL(imageUrl);
        if (parsed.pathname.startsWith('/promotions/images/')) {
          return imageUrl;
        }

        const normalizedPath = parsed.pathname.startsWith('/')
          ? parsed.pathname.slice(1)
          : parsed.pathname;
        return `${parsed.origin}/promotions/images/${normalizedPath}`;
      } catch {
        return imageUrl;
      }
    }

    const normalizedPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
    return `/promotions/images/${normalizedPath}`;
  }

  private handlePromotionsChange(promotions: PromotionModel[]) {
    if (!promotions?.length) {
      this.stopAutoSlide();
      this.currentIndex = 0;
      return;
    }

    if (this.currentIndex >= promotions.length) {
      this.currentIndex = 0;
    }

    if (promotions.length > 1) {
      this.restartAutoSlide();
    } else {
      this.stopAutoSlide();
    }
  }

  private restartAutoSlide() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.stopAutoSlide();
    this.autoSlideInterval = setInterval(() => this.next(), 5000);
  }

  private stopAutoSlide() {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
      this.autoSlideInterval = null;
    }
  }
}
