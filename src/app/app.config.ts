import {
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import {provideRouter, withInMemoryScrolling} from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  provideHttpClient,
  withFetch,
  HTTP_INTERCEPTORS,
  withInterceptorsFromDi
} from '@angular/common/http';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import {provideAnimations} from '@angular/platform-browser/animations';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top', // always go to top on navigation
        anchorScrolling: 'enabled',       // enable #anchor scrolling
      }),
    ),

    // Hydratation / SSR
    provideClientHydration(withEventReplay()),

    // HTTP d'abord, puis interceptors DI
    provideHttpClient(
      withInterceptorsFromDi(),
      withFetch()
    ),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },

    // Locale
    { provide: LOCALE_ID, useValue: 'fr-FR' },

    // Active les animations côté client
    provideAnimations(),

    // Petit helper debug (attention côté SSR)
    {
      provide: 'DEBUG_PROVIDER',
      useFactory: () => {
        console.log('APP CONFIG LOADED!!!');
        return true;
      }
    }
  ]
};
