import { Component, computed, effect, inject, input, resource } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Ledger } from '../../data/ledger-api';
import { conteggiPerTipo, sortByCreatedDesc } from '../../data/ledger-logic';
import { renderMarkdown } from '../../data/markdown';
import { TIPO_PLURALE, UNIVERSO_LABEL } from '../../data/labels';
import { IndexEntry, Tipo, Universo, isUniverso } from '../../models/ledger';
import { RigaCard } from '../../components/riga-card';
import { BadgeUniverso } from '../../components/badges';

const ULTIME = 20;

interface UniversoSnapshot {
  regioni: IndexEntry[];
  conteggi: { tipo: Tipo; n: number }[];
  ultime: IndexEntry[];
  totale: number;
}

@Component({
  selector: 'app-universo',
  imports: [RouterLink, RigaCard, BadgeUniverso],
  templateUrl: './universo.html',
})
export class UniversoPage {
  private readonly ledger = inject(Ledger);
  private readonly title = inject(Title);

  /** Dal parametro di route `:universo` (component input binding). */
  readonly universo = input.required<string>();
  readonly valido = computed(() => isUniverso(this.universo()));
  readonly uni = computed<Universo>(() => {
    const u = this.universo();
    return isUniverso(u) ? u : 'neofeudal';
  });
  readonly label = computed(() => UNIVERSO_LABEL[this.uni()]);
  readonly tipoPlurale = TIPO_PLURALE;

  readonly bibbia = resource({
    params: () => (this.valido() ? this.uni() : undefined),
    loader: async ({ params }) => renderMarkdown(await this.ledger.bibbia(params)),
  });

  private readonly snap = computed(() =>
    this.ledger.snapshot<UniversoSnapshot>(`u:${this.universo()}`),
  );

  readonly dati = resource({
    params: () => (this.valido() ? this.uni() : undefined),
    loader: async ({ params }) => {
      const idx = (await this.ledger.index()).filter((r) => r.universo === params);
      const snap: UniversoSnapshot = {
        regioni: sortByCreatedDesc(idx.filter((r) => r.tipo === 'regione')),
        conteggi: conteggiPerTipo(idx),
        ultime: idx.slice(0, ULTIME),
        totale: idx.length,
      };
      this.ledger.saveSnapshot(`u:${params}`, snap);
      return snap;
    },
  });

  readonly vista = computed<UniversoSnapshot | null>(() =>
    this.dati.hasValue() ? this.dati.value() : this.snap(),
  );

  constructor() {
    effect(() => {
      this.title.setTitle(
        this.valido() ? `lore-ledger · ${this.label()}` : 'lore-ledger · universo sconosciuto',
      );
    });
  }
}
