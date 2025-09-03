import { Component, Input }           from '@angular/core';
import { NgOptimizedImage }            from '@angular/common';
import { InViewportDirective }         from '../directives/in-viewport.directive';

@Component({
  selector: 'app-metiers-pictos',
  standalone: true,
  imports: [
    NgOptimizedImage,
    InViewportDirective
  ],
  templateUrl: './metiers-pictos.component.html',
  styleUrls: ['./metiers-pictos.component.scss']    // <— styleUrls (au pluriel)
})
export class MetiersPictosComponent {
  @Input() items: { img: string; label: string }[] = [];
}
