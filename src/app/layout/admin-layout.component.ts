import { Component, DestroyRef, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent {
  menuOpen = true;
  isMobileView = false;

  private readonly destroyRef = inject(DestroyRef);
  private readonly breakpoint = inject(BreakpointObserver);

  constructor(private auth: AuthService, private router: Router) {
    this.observeViewport();
  }

  // ✅ Synchronous: évite le flicker et les soucis d’init
  get isAuth(): boolean {
    return this.auth.isAuthenticated();
  }

  logout() {
    this.auth.logout();
    // Choisis UNE seule route de login pour tout le monde (recommandé: '/login')
    this.router.navigate(['/login']);
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
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
}
