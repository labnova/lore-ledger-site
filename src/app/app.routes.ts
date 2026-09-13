import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'lore-ledger · feed',
    loadComponent: () => import('./pages/feed/feed').then((m) => m.FeedPage),
  },
  {
    path: 'u/:universo',
    loadComponent: () => import('./pages/universo/universo').then((m) => m.UniversoPage),
  },
  {
    path: 'r/:id',
    loadComponent: () => import('./pages/riga/riga').then((m) => m.RigaPage),
  },
  {
    path: 'racconti',
    title: 'lore-ledger · racconti',
    loadComponent: () => import('./pages/racconti/racconti').then((m) => m.RaccontiPage),
  },
  {
    path: 'racconto/:slug',
    loadComponent: () => import('./pages/racconto/racconto').then((m) => m.RaccontoPage),
  },
  {
    path: 'g',
    title: 'lore-ledger · grafo',
    loadComponent: () => import('./pages/grafo/grafo').then((m) => m.GrafoPage),
  },
  {
    path: 'e',
    title: 'lore-ledger · estrazioni',
    loadComponent: () => import('./pages/estrazioni/estrazioni').then((m) => m.EstrazioniPage),
  },
  {
    path: 'e/:n',
    loadComponent: () => import('./pages/estrazione/estrazione').then((m) => m.EstrazionePage),
  },
  {
    path: 'm',
    title: 'lore-ledger · macchina',
    loadComponent: () => import('./pages/macchina/macchina').then((m) => m.MacchinaPage),
  },
  {
    path: '**',
    title: 'lore-ledger · pagina non trovata',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFoundPage),
  },
];
