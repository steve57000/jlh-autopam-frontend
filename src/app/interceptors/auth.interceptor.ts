// src/app/interceptors/auth.interceptor.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import {
  HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse
} from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../shared/toast/toast.service';
import { environment } from '../../environments/environment'

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly isBrowser: boolean;

  // Endpoints d’auth pour lesquels on ne fait PAS de logout/redirect auto
  private readonly authPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password'
  ];

  constructor(
    private auth: AuthService,
    private router: Router,
    private toast: ToastService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.getToken();

    // Prépare les headers à ajouter sans écraser ceux déjà présents
    const headers: Record<string, string> = {};

    // Accept: par défaut JSON ; pour blob on accepte calendriers/texte
    if (!req.headers.has('Accept')) {
      headers['Accept'] = req.responseType === 'blob'
        ? 'text/calendar, text/plain, */*'
        : 'application/json';
    }

    // Content-Type: uniquement si corps JSON & pas FormData & pas déjà défini
    const hasJsonBody = !!req.body && !(req.body instanceof FormData);
    if (hasJsonBody && !req.headers.has('Content-Type')) {
      headers['Content-Type'] = 'application/json';
    }

    // Authorization
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const cloned = Object.keys(headers).length ? req.clone({ setHeaders: headers }) : req;

    return next.handle(cloned).pipe(
      catchError((err: HttpErrorResponse) => {
        // message “humain” (fallback sur statusText)
        const msg = (err?.error?.message || err?.message || err?.statusText || 'Une erreur est survenue').toString();

        // 0 = réseau/serveur down/CORS
        if (err.status === 0) {
          this.toast.error('Impossible de joindre le serveur.', 'Vérifiez votre connexion ou réessayez plus tard.');
          return throwError(() => err);
        }

        // 401 — non authentifié
        if (err.status === 401) {
          // Évite les redirections intempestives pendant le SSR
          if (this.isBrowser) {
            // Si l’URL ne correspond PAS à un endpoint d’auth, on déconnecte proprement
            if (!this.isAuthPath(cloned.url)) {
              this.auth.logout();
              this.toast.info('Votre session a expiré. Veuillez vous reconnecter.');
              // Garde une navigation propre sans “flash” grâce à replaceUrl
              this.router.navigate(['/login'], { replaceUrl: true, queryParams: { r: this.router.url } });
            }
          }
          return throwError(() => err);
        }

        // 403 — interdit
        if (err.status === 403) {
          this.toast.warning('Action non autorisée.', 'Vous n’avez pas les permissions requises.');
          return throwError(() => err);
        }

        // 404 — ressource absente
        if (err.status === 404) {
          this.toast.info('Ressource introuvable.', 'La ressource demandée est indisponible.');
          return throwError(() => err);
        }

        // 409 — conflit (ex. doublon)
        if (err.status === 409) {
          this.toast.warning('Conflit détecté.', msg);
          return throwError(() => err);
        }

        // 422 — validation
        if (err.status === 422) {
          this.toast.warning('Données invalides.', 'Merci de vérifier le formulaire.');
          return throwError(() => err);
        }

        // 5xx — serveur
        if (err.status >= 500) {
          this.toast.error('Erreur interne du serveur.', 'Réessayez plus tard.');
          return throwError(() => err);
        }

        // Autres cas
        this.toast.error('Erreur', msg);
        return throwError(() => err);
      })
    );
  }

  private isAuthPath(url: string): boolean {
    try {
      // Gestion URL absolue ou relative
      const api = environment.apiBaseUrl;
      const path = new URL(url, typeof window !== 'undefined' ? window.location.origin : `${api}`).pathname;
      return this.authPaths.some(p => path.includes(p));
    } catch {
      return this.authPaths.some(p => url.includes(p));
    }
  }
}
