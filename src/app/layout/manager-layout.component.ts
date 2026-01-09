import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../services/auth.service';
import { filter } from 'rxjs';
import { ToastContainerComponent } from '../shared/toast/toast-container.component';

@Component({
  selector: 'app-manager-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastContainerComponent],
  templateUrl: './manager-layout.component.html',
  styleUrls: ['./manager-layout.component.scss']
})
export class ManagerLayoutComponent {
  menuOpen = true;
  isMobileView = false;
  readonly navId = 'manager-nav';
  readonly pageTitle = signal('Gestion');

  private readonly destroyRef = inject(DestroyRef);
  private readonly breakpoint = inject(BreakpointObserver);
  private readonly route = inject(ActivatedRoute);

  constructor(private auth: AuthService, private router: Router) {
    this.observeViewport();
    this.observeRouteTitle();
  }

  get isAuth(): boolean {
    return this.auth.isAuthenticated();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  openMenu() {
    this.menuOpen = true;
  }

  collapseMenu() {
    this.menuOpen = false;
  }

  closeMenu() {
    this.menuOpen = this.isMobileView ? false : this.menuOpen;
  }

  private observeViewport() {
    if (typeof window === 'undefined') {
      this.menuOpen = true;
      this.isMobileView = false;
      return;
    }

    const initialMobile = window.matchMedia('(max-width: 768px)').matches;
    this.isMobileView = initialMobile;
    this.menuOpen = !initialMobile;

    this.breakpoint
      .observe('(max-width: 768px)')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(state => {
        const wasMobile = this.isMobileView;
        this.isMobileView = state.matches;

        if (this.isMobileView) {
          this.menuOpen = false;
        } else if (wasMobile) {
          this.menuOpen = true;
        }
      });
  }

  private observeRouteTitle() {
    const updateTitle = () => {
      let snapshot: ActivatedRouteSnapshot | null = this.route.snapshot;

      while (snapshot?.firstChild) {
        snapshot = snapshot.firstChild;
      }

      const dataTitle = snapshot?.data?.['title'];
      this.pageTitle.set(dataTitle ?? 'Gestion');
    };

    updateTitle();

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => updateTitle());
  }
}
