import { Component, Input } from '@angular/core';
import {NgOptimizedImage} from '@angular/common';

@Component({
  selector: 'app-metiers-pictos',
  templateUrl: './metiers-pictos.html',
  styleUrl: './metiers-pictos.scss',
  standalone: true,
  imports: [
    NgOptimizedImage
  ]
})
export class MetiersPictos {
  @Input() items: { img: string; label: string }[] = [];
}
