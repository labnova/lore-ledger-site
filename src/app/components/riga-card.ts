import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IndexEntry, Riga } from '../models/ledger';
import { chiaviRiga, testoCard } from '../data/ledger-logic';
import { BadgeFlag, BadgeRelazione, BadgeTipo, BadgeUniverso } from './badges';

/**
 * Card di una voce dell'indice: id in mono, badge tipo/universo/relazione, titolo.
 * Con `dettaglio` (la riga completa) mostra le chiavi in chiaro, il gancio intero e il
 * secondario (torsione/cosa/note) troncato; senza, il sommario dell'indice.
 */
@Component({
  selector: 'app-riga-card',
  imports: [RouterLink, BadgeTipo, BadgeUniverso, BadgeRelazione, BadgeFlag],
  template: `
    @let r = riga();
    <article class="card uni-{{ r.universo }}">
      <div class="card-top">
        <a class="mono" [routerLink]="['/r', r.id]">{{ r.id }}</a>
        <app-badge-tipo [tipo]="r.tipo" />
        <app-badge-universo [universo]="r.universo" />
        <app-badge-relazione [relazione]="r.relazione" />
        <app-badge-flag [poc]="r.poc" [prod]="r.prod" />
      </div>
      <h3 class="card-titolo"><a [routerLink]="['/r', r.id]">{{ r.titolo || r.id }}</a></h3>
      @if (chiavi(); as c) {
        <p class="card-chiavi">{{ c }}</p>
      }
      @if (testo(); as t) {
        @if (t.gancio) {
          <p class="card-gancio">{{ t.gancio }}</p>
        }
        @if (t.secondario) {
          <p class="card-sommario">{{ t.secondario }}</p>
        }
      } @else if (r.sommario) {
        <p class="card-sommario">{{ r.sommario }}</p>
      }
      <div class="card-meta">
        <span>{{ r.created }}</span>
        <a [routerLink]="['/e', r.estrazione]">estrazione #{{ r.estrazione }}</a>
        @if (r.regione) {
          <span>regione: {{ r.regione }}</span>
        }
        @if (r.parent_id) {
          <span>madre: {{ r.parent_id }}</span>
        }
      </div>
    </article>
  `,
})
export class RigaCard {
  readonly riga = input.required<IndexEntry>();
  readonly dettaglio = input<Riga | null>(null);
  readonly chiavi = computed(() => {
    const d = this.dettaglio();
    return d ? chiaviRiga(d) : null;
  });
  readonly testo = computed(() => {
    const d = this.dettaglio();
    return d ? testoCard(d) : null;
  });
}
