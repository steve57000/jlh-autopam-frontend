import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const ManagerMatchGuard: CanMatchFn = (): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return false;
  }

  if (!auth.isAuthenticated()) return router.parseUrl('/login');
  const role = auth.getUserRole();
  if (role === 'MANAGER') return true;
  if (role === 'ADMIN') return router.parseUrl('/admin');
  return router.parseUrl('/dashboard');
};
