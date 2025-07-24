import { Component } from '@angular/core';
import {HeaderComponent} from '../header/header';
import {RouterOutlet} from '@angular/router';
import {Footer} from '../footer/footer';

@Component({
  selector: 'app-main-layout',
  imports: [
    HeaderComponent,
    RouterOutlet,
    Footer
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayoutComponent {

}
