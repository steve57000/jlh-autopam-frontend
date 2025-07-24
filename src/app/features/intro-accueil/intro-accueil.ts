import { Component } from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {NgOptimizedImage} from '@angular/common';

@Component({
  selector: 'app-intro-accueil',
  standalone: true,
  imports: [MatIconModule, NgOptimizedImage],
  templateUrl: './intro-accueil.html',
  styleUrl: './intro-accueil.scss'
})
export class IntroAccueil {

}
