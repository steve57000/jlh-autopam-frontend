import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import {
  HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse
} from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly isBrowser: boolean;

  constructor(
    private auth: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.getToken();

    // Toujours envoyer Accept: application/json
    let setHeaders: Record<string, string> = {};

    // N'ajoute Accept que s'il n'existe pas déjà
    if (!req.headers.has('Accept')) {
      // Si tu veux: blob => accepte tout, sinon JSON
      // (req.responseType vaut 'json' par défaut)
      setHeaders['Accept'] = (req.responseType === 'blob')
        ? 'text/calendar, text/plain, */*'
        : 'application/json';
    }

    // Content-Type uniquement si corps JSON ET pas FormData
    const hasBody = !!req.body && !(req.body instanceof FormData);
    if (hasBody && !req.headers.has('Content-Type')) {
      setHeaders['Content-Type'] = 'application/json';
    }
    if (token) setHeaders['Authorization'] = `Bearer ${token}`;

    const cloned = Object.keys(setHeaders).length ? req.clone({ setHeaders }) : req;

    return next.handle(cloned).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401 && this.isBrowser) {
          this.auth.logout();
          if (this.router.url !== '/login') this.router.navigate(['/login']);
        }
       else if (err.status === 403) {
      // → 403: afficher un message mais NE PAS logout
       window.alert('Action non autorisée');
      }
        return throwError(() => err);
      })
    );
  }
}
