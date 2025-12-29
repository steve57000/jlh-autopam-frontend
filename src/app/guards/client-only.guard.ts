import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class ClientOnlyGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    const role = this.auth.getUserRole(); // 'ADMIN' | 'CLIENT' | null
    if (role === 'CLIENT') return true;
    if (role === 'ADMIN') return this.router.parseUrl('/admin');
    return this.router.parseUrl('/login');
  }
}
