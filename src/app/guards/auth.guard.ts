// src/app/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

function check(): boolean | UrlTree {
  const router = inject(Router);
  const auth = inject(AuthService);
  const platformId = inject(PLATFORM_ID);

  // SSR : on ne redirige pas. Le client décidera après hydratation.
  if (!isPlatformBrowser(platformId)) return true;

  // Vérif synchrone du token
  if (auth.isAuthenticated()) return true;
  return router.parseUrl('/login');
}

export const AuthGuard: CanActivateFn = () => check();
export const AuthMatchGuard: CanMatchFn = () => check();
