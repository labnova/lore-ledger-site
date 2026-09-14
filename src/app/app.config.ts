import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  provideClientHydration,
  withEventReplay,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';

import { routes } from './app.routes';

/** File che crescono con il ledger: mai incorporati nell'HTML, il client li scarica da sé. */
const GRANDI = /\/data\/(index|graph|estrazioni|bacheca)\.json$|\/data\/rows\//;

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withViewTransitions(),
    ),
    provideClientHydration(
      withEventReplay(),
      withHttpTransferCacheOptions({ filter: (req) => !GRANDI.test(req.url) }),
    ),
  ],
};
