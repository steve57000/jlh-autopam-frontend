import { Component } from '@angular/core';
import {HeaderComponent} from './header.component';
import { Router, RouterOutlet, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import {FooterComponent} from './footer.component';

@Component({
  selector: 'app-main-layout',
  imports: [
    HeaderComponent,
    RouterOutlet,
    FooterComponent
  ],
  templateUrl: './main-layout.component.html',
  standalone: true,
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {
  loadingRoute = false;

  constructor(private router: Router) {
    this.router.events.subscribe(ev => {
      if (ev instanceof NavigationStart)  this.loadingRoute = true;
      if (ev instanceof NavigationEnd
        || ev instanceof NavigationCancel
        || ev instanceof NavigationError) this.loadingRoute = false;
    });
  }
}
