import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const loginRedirectGuard: CanActivateFn = (): boolean | UrlTree => {
  const router = inject(Router);
  const auth   = inject(AuthService);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) return true; // pas de redirection côté SSR
  return auth.isAuthenticated() ? router.parseUrl('/dashboard') : true;
};
