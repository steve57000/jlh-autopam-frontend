import { Component, HostBinding } from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {NgOptimizedImage} from '@angular/common';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrls: ['./header.scss'],
  imports: [
    RouterLink,
    NgOptimizedImage,
    RouterLinkActive
  ],
  standalone: true
})
export class HeaderComponent {
  menuOpen = false;

  // Bloque le scroll du body quand menu burger ouvert
  @HostBinding('class.menu-open')
  get isMenuOpen() {
    return this.menuOpen;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    document.body.style.overflow = this.menuOpen ? 'hidden' : '';
  }

  closeMenu() {
    this.menuOpen = false;
    document.body.style.overflow = '';
  }
}
