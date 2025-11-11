import { Component, Inject, PLATFORM_ID, signal, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header.component';
import { FooterComponent } from './footer.component';
import { FullPageSpinnerComponent } from '../shared/full-page-spinner/full-page-spinner.component';
import { ToastContainerComponent } from '../shared/toast/toast-container.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  imports: [
    HeaderComponent,
    RouterOutlet,
    FullPageSpinnerComponent,
    FooterComponent,
    ToastContainerComponent,
  ]
})
export class MainLayoutComponent {
  showSpinner = signal<boolean>(false);

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) {}

  get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      // Petit flash au montage pour couvrir la lecture token + guards
      this.showSpinner.set(true);
      queueMicrotask(() => this.showSpinner.set(false));

      // (Optionnel mais recommandé) spinner pendant les navigations
      this.router.events.subscribe(evt => {
        if (evt instanceof NavigationStart) this.showSpinner.set(true);
        if (evt instanceof NavigationEnd || evt instanceof NavigationCancel || evt instanceof NavigationError) {
          // micro-décalage pour laisser le composant cible s’hydrater
          queueMicrotask(() => this.showSpinner.set(false));
        }
      });
    }
  }
}
