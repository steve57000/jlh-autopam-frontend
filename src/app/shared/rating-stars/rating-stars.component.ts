import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rating-stars',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rating-stars.component.html',
  styleUrls: ['./rating-stars.component.scss']
})
export class RatingStarsComponent {
  @Input() rating = 0;
  @Input() max = 5;
  @Input() showValue = true;

  get roundedRating(): number {
    const value = Number.isFinite(this.rating) ? this.rating : 0;
    return Math.round(value * 10) / 10;
  }

  get starStates(): boolean[] {
    const filled = Math.round(this.rating);
    return Array.from({ length: this.max }, (_, index) => index < filled);
  }

  protected readonly toString = toString;
}
