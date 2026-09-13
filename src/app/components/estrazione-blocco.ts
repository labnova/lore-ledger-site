import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Estrazione, Riga } from '../models/ledger';
import { GruppoTipo, TestataEstrazione, chiaviPiatte } from '../data/ledger-logic';
import { TIPO_PLURALE, UNIVERSO_LABEL } from '../data/labels';
import { BadgeUniverso } from './badges';
import { RigaCard } from './riga-card';

/**
 * Blocco di un'estrazione: testata `#n · Universo · regione · invenzione madre`, chiavi uscite,
 * righe raggruppate per tipo. Usato nel feed (vista estrazioni) e nella scheda `/e/:n`.
 */
@Component({
  selector: 'app-estrazione-blocco',
  imports: [RouterLink, BadgeUniverso, RigaCard],
  template: `
    @let t = testata();
    <section class="blocco-estrazione" [id]="'e-' + t.n">
      <header class="blocco-testa">
        <h2 [class.h1]="titolo()">
          <a class="mono" [routerLink]="['/e', t.n]">#{{ t.n }}</a>
          @if (t.universo) {
            <span aria-hidden="true">·</span>
            <app-badge-universo [universo]="t.universo" />
          }
          @if (t.regioneNome) {
            <span aria-hidden="true">·</span>
            @if (t.regione) {
              <a [routerLink]="['/r', t.regione.id]">{{ t.regioneNome }}</a>
            } @else {
              <span>{{ t.regioneNome }}</span>
            }
          }
          @if (t.invenzione) {
            <span aria-hidden="true">·</span>
            <a [routerLink]="['/r', t.invenzione.id]">{{ t.invenzione.titolo }}</a>
          }
        </h2>
        <p class="blocco-meta mono">
          <span>{{ estrazione().lotto }}</span>
          <span>{{ estrazione().created }}</span>
          <span>esito: {{ estrazione().esito }}</span>
          @if (estrazione().forzata) {
            <span>forzata ({{ estrazione().campi_forzati.join(', ') || 'sì' }})</span>
          }
        </p>
        @if (chiavi().length) {
          <p class="blocco-chiavi mono">
            @for (c of chiavi(); track c.k) {
              <span><span class="muted">{{ c.k }}:</span> {{ c.v }}</span>
            }
          </p>
        }
      </header>
      @for (g of gruppi(); track g.tipo) {
        <h3>{{ tipoPlurale[g.tipo] }} <span class="muted mono">({{ g.righe.length }})</span></h3>
        <div class="griglia due">
          @for (r of g.righe; track r.id) {
            <app-riga-card [riga]="r" [dettaglio]="dettagli().get(r.id) ?? null" />
          }
        </div>
      } @empty {
        <p class="muted">Nessuna riga pubblicata per questa estrazione.</p>
      }
    </section>
  `,
})
export class EstrazioneBlocco {
  readonly estrazione = input.required<Estrazione>();
  readonly testata = input.required<TestataEstrazione>();
  readonly gruppi = input.required<GruppoTipo[]>();
  readonly dettagli = input<Map<string, Riga>>(new Map());
  /** Nella scheda `/e/:n` la testata è il titolo della pagina. */
  readonly titolo = input(false);
  readonly tipoPlurale = TIPO_PLURALE;
  readonly universoLabel = UNIVERSO_LABEL;
  readonly chiavi = computed(() => chiaviPiatte(this.estrazione().chiavi));
}
