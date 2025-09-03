// src/app/guards/admin.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    if (!this.auth.isAuthenticated()) return this.router.parseUrl('/login');
    const role = this.auth.getUserRole();
    return role === 'ADMIN' ? true : this.router.parseUrl('/dashboard');
  }
}
