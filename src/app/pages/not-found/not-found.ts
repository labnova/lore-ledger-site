import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <h1>Pagina non trovata</h1>
    <p>Questo indirizzo non corrisponde a nessuna pagina del sito.</p>
    <p>
      <a routerLink="/">Feed</a> · <a routerLink="/g">Grafo</a> ·
      <a routerLink="/e">Estrazioni</a> · <a routerLink="/m">Macchina</a>
    </p>
  `,
})
export class NotFoundPage {}
