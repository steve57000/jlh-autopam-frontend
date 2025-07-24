import { Component, Input, HostListener } from '@angular/core';
import {NgClass} from '@angular/common';

@Component({
  selector: 'app-section-caroussel',
  templateUrl: './section-caroussel.html',
  styleUrl: './section-caroussel.scss',
  imports: [
    NgClass
  ],
  standalone: true
})
export class SectionCaroussel {
  @Input() title!: string;
  @Input() background!: 'gradient' | 'white';
  @Input() cards: { title: string; content: string; color: 'light' | 'dark' }[] = [];
  @Input() activeIndex: number = 0; // Contrôlé par le parent

  private startX: number | null = null;
  private deltaX: number = 0;

  goTo(i: number) {
    if (this.cards.length > 0) {
      this.activeIndex = i;
    }
  }

  // Swipe tactile
  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    if (event.touches.length === 1) {
      this.startX = event.touches[0].clientX;
      this.deltaX = 0;
    }
  }
  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (this.startX !== null && event.touches.length === 1) {
      this.deltaX = event.touches[0].clientX - this.startX;
    }
  }
  @HostListener('touchend')
  onTouchEnd() {
    if (this.startX !== null && this.cards.length > 0) {
      if (this.deltaX < -40) { // Swipe gauche
        this.activeIndex = (this.activeIndex + 1) % this.cards.length;
      } else if (this.deltaX > 40) { // Swipe droite
        this.activeIndex = (this.activeIndex - 1 + this.cards.length) % this.cards.length;
      }
      this.startX = null;
      this.deltaX = 0;
    }
  }
}
