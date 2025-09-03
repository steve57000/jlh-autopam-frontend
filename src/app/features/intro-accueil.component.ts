import { Component }        from '@angular/core';
import { MatIconModule }    from '@angular/material/icon';
import { NgOptimizedImage } from '@angular/common';
import { InViewportDirective } from '../directives/in-viewport.directive';

@Component({
  selector: 'app-intro-accueil',
  standalone: true,
  imports: [
    MatIconModule,
    NgOptimizedImage,
    InViewportDirective      // ← on importe la directive
  ],
  templateUrl: './intro-accueil.component.html',
  styleUrls: ['./intro-accueil.component.scss']
})
export class IntroAccueilComponent { }
