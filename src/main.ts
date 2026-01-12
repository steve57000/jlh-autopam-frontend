import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

registerLocaleData(localeFr, 'fr-FR');

if (typeof window !== 'undefined' && window.location.hash.startsWith('#/')) {
  const hashPath = window.location.hash.slice(1);
  const nextUrl = `${hashPath}${window.location.search ?? ''}`;
  window.history.replaceState(null, '', nextUrl);
}

bootstrapApplication(App, appConfig)
  .catch(err => console.error(err));
