import { Component, HostBinding, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
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
export class HeaderComponent implements OnInit {
  menuOpen = false;
  loggedIn = false;
  role: string | null = null;

  // Ajoute la classe `menu-open` sur le host quand menuOpen=true
  @HostBinding('class.menu-open')
  get isMenuOpen() {
    return this.menuOpen;
  }

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.auth.authState().subscribe(isAuth => {
      this.loggedIn = isAuth;
      this.role     = isAuth ? this.auth.getUserRole() : null;
    });
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    document.body.style.overflow = this.menuOpen ? 'hidden' : '';
  }

  closeMenu() {
    this.menuOpen = false;
    document.body.style.overflow = '';
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
    this.closeMenu();
  }
}
