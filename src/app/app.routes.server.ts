import { inject } from '@angular/core';
import { RenderMode, ServerRoute } from '@angular/ssr';
import { Ledger } from './data/ledger-api';
import { UNIVERSI } from './models/ledger';

/**
 * Prerender delle route statiche: `/`, `/u/<universo>` per i cinque universi, `/racconti`,
 * `/racconto/<slug>` per ogni racconto approvato, `/g`, `/e`, `/m`.
 * `/r/:id` e le pagine sconosciute si rendono sul client (`index.csr.html`, vedi
 * `staticwebapp.config.json`).
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  {
    path: 'u/:universo',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => UNIVERSI.map((universo) => ({ universo })),
  },
  { path: 'racconti', renderMode: RenderMode.Prerender },
  {
    path: 'racconto/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => (await inject(Ledger).racconti()).map((r) => ({ slug: r.slug })),
  },
  { path: 'g', renderMode: RenderMode.Prerender },
  { path: 'e', renderMode: RenderMode.Prerender },
  {
    path: 'e/:n',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () =>
      (await inject(Ledger).estrazioni()).map((e) => ({ n: String(e.estrazione) })),
  },
  { path: 'm', renderMode: RenderMode.Prerender },
  { path: 'r/:id', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Client },
];
