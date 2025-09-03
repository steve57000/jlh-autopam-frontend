import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent {
  menuOpen = false;

  constructor(private auth: AuthService, private router: Router) {}

  // ✅ Synchronous: évite le flicker et les soucis d’init
  get isAuth(): boolean {
    return this.auth.isAuthenticated();
  }

  logout() {
    this.auth.logout();
    // Choisis UNE seule route de login pour tout le monde (recommandé: '/login')
    this.router.navigate(['/login']);
  }

  toggleMenu() { this.menuOpen = !this.menuOpen; }
  closeMenu()  { this.menuOpen = false; }
}
