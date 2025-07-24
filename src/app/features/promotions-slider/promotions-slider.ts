import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { PromotionModel } from '../../modeles/promotion.model';
import {DatePipe, NgOptimizedImage} from '@angular/common';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-promotions-slider',
  templateUrl: './promotions-slider.html',
  styleUrls: ['./promotions-slider.scss'],
  imports: [
    DatePipe,
    NgOptimizedImage,
    MatIconModule
  ],
  standalone: true
})
export class PromotionsSlider implements OnInit, OnDestroy {
  @Input() promotions: PromotionModel[] = [];
  currentIndex = 0;
  autoSlideInterval: any;

  ngOnInit() {
    if (this.promotions.length > 1) {
      this.autoSlideInterval = setInterval(() => this.next(), 5000);
    }
  }

  ngOnDestroy() {
    if (this.autoSlideInterval) clearInterval(this.autoSlideInterval);
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.promotions.length;
  }

  prev() {
    this.currentIndex = (this.currentIndex - 1 + this.promotions.length) % this.promotions.length;
  }

  goTo(index: number) {
    this.currentIndex = index;
  }

  getImageUrl(imageUrl: string): string {
    return imageUrl || '';
  }

}
