// src/app/guards/hydration-ready.guard.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { CanActivate } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HydrationReadyGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  async canActivate(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      // Côté serveur : on ne force aucune redirection, on laisse le rendu passer
      return true;
    }
    // Côté navigateur : attend un tick de l’Observable qui reflète le token
    try {
      await firstValueFrom(
        this.auth.authState().pipe(timeout(300)) // très court, évite de bloquer
      );
    } catch {
      // même si ça timeoute, on laisse passer ; les autres guards feront foi
    }
    return true;
  }
}
