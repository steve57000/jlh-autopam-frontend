import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class ManagerGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    if (!this.auth.isAuthenticated()) return this.router.parseUrl('/login');
    const role = this.auth.getUserRole();
    if (role === 'MANAGER') return true;
    if (role === 'ADMIN') return this.router.parseUrl('/admin');
    return this.router.parseUrl('/dashboard');
  }
}
