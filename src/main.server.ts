import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

// enregistrer la locale avant tout
registerLocaleData(localeFr, 'fr-FR');

import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { App } from './app/app';
import { config } from './app/app.config.server';

export default (context: BootstrapContext) => bootstrapApplication(App, config, context);
