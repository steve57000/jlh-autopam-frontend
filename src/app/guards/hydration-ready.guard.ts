import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class HydrationReadyService {
  /** Ici on pourrait attendre un signal global ; pour l’instant, on dit "OK" dès que c'est le navigateur". */
  isReady(): boolean { return true; }
}

export const HydrationReadyGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  const ready = inject(HydrationReadyService);

  // Côté SSR : toujours OK (pas de redirection côté serveur)
  if (!isPlatformBrowser(platformId)) return true;

  // Côté navigateur : on pourrait attendre un flag ; version minimale => OK direct
  return ready.isReady();
};
