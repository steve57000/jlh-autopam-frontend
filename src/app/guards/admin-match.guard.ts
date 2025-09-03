// src/app/guards/admin-match.guard.ts  ⬅️ NOUVEAU
import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Empêche le *lazy-load* du module /admin si l’utilisateur n’est pas ADMIN.
 * - SSR : retourne false (pas de match) pour éviter le chargement du bundle côté serveur.
 * - Browser : autorise le match uniquement si rôle ADMIN, sinon redirige /dashboard ou /login.
 */
export const AdminMatchGuard: CanMatchFn = (): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    // Côté SSR, on ne sert pas le bundle admin par défaut
    return false;
  }

  if (!auth.isAuthenticated()) return router.parseUrl('/login');
  return auth.getUserRole() === 'ADMIN' ? true : router.parseUrl('/dashboard');
};
