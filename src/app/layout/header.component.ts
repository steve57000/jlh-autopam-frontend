import { BreakpointObserver } from '@angular/cdk/layout';
import { DOCUMENT, NgOptimizedImage, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, ElementRef, HostBinding, HostListener, Inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    NgOptimizedImage
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  menuOpen = false;
  loggedIn = false;
  role: string | null = null;
  isMobileMenu = false;
  catalogueOpen = false;
  aboutOpen = false;
  private mediaQueryList: MediaQueryList | null = null;
  private mediaQueryListener?: (event: MediaQueryListEvent) => void;
  private readonly destroyRef = inject(DestroyRef);
  @ViewChild('catalogueGroup') catalogueGroup?: ElementRef<HTMLElement>;
  @ViewChild('aboutGroup') aboutGroup?: ElementRef<HTMLElement>;

  private readonly mobileQuery = '(max-width: 719px)';
  private readonly isBrowser: boolean;

  // Ajoute la classe `menu-open` sur le host quand menuOpen=true
  @HostBinding('class.menu-open')
  get isMenuOpen() {
    return this.menuOpen;
  }

  constructor(
    private auth: AuthService,
    private router: Router,
    private breakpointObserver: BreakpointObserver,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser && typeof window !== 'undefined') {
      this.mediaQueryList = window.matchMedia(this.mobileQuery);
      this.isMobileMenu = this.mediaQueryList.matches;
    }
  }

  ngOnInit() {
    this.auth.authState().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(isAuth => {
      this.loggedIn = isAuth;
      this.role     = isAuth ? this.auth.getUserRole() : null;
    });

    this.breakpointObserver
      .observe(this.mobileQuery)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(state => {
        this.isMobileMenu = state.matches;
        if (!this.isMobileMenu && this.menuOpen) {
          this.setMenuState(false);
        }
      });

    if (this.mediaQueryList) {
      this.mediaQueryListener = (event: MediaQueryListEvent) => {
        this.isMobileMenu = event.matches;
        if (!event.matches) {
          this.setMenuState(false);
        }
      };
      this.mediaQueryList.addEventListener('change', this.mediaQueryListener);
    }
  }

  toggleMenu() {
    this.setMenuState(!this.menuOpen);
  }

  toggleGroup(group: 'catalogue' | 'about', event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (group === 'catalogue') {
      this.catalogueOpen = !this.catalogueOpen;
      if (this.catalogueOpen) {
        this.aboutOpen = false;
      }
    } else {
      this.aboutOpen = !this.aboutOpen;
      if (this.aboutOpen) {
        this.catalogueOpen = false;
      }
    }
  }

  ngOnDestroy() {
    if (this.mediaQueryList && this.mediaQueryListener) {
      this.mediaQueryList.removeEventListener('change', this.mediaQueryListener);
    }
  }

  closeMenu() {
    this.setMenuState(false);
  }

  closeGroups() {
    this.catalogueOpen = false;
    this.aboutOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.isBrowser) {
      return;
    }
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    const insideCatalogue = this.catalogueGroup?.nativeElement.contains(target) ?? false;
    const insideAbout = this.aboutGroup?.nativeElement.contains(target) ?? false;
    if (!insideCatalogue && !insideAbout) {
      this.closeGroups();
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
    this.closeMenu();
  }

  private setMenuState(open: boolean) {
    this.menuOpen = open;
    if (!open) {
      this.closeGroups();
    }

    if (this.isBrowser) {
      this.document.body.classList.toggle('menu-open', open);
      this.document.documentElement.classList.toggle('menu-open', open);
    }
  }
}
