import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IndexEntry } from '../models/ledger';
import { BadgeFlag, BadgeRelazione, BadgeTipo, BadgeUniverso } from './badges';

/** Card di una voce dell'indice: id in mono, badge tipo/universo/relazione, titolo, sommario. */
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
      @if (r.sommario) {
        <p class="card-sommario">{{ r.sommario }}</p>
      }
      <div class="card-meta">
        <span>{{ r.created }}</span>
        <span>estrazione #{{ r.estrazione }}</span>
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
}
