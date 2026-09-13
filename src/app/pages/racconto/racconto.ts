import { Component, computed, effect, inject, input, resource } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Ledger } from '../../data/ledger-api';
import { sceneDelTesto } from '../../data/ledger-logic';
import { renderMarkdown } from '../../data/markdown';
import { UNIVERSO_LABEL } from '../../data/labels';
import { IndexEntry, Racconto } from '../../models/ledger';
import { BadgeUniverso } from '../../components/badges';

interface RigaUsata {
  id: string;
  titolo: string;
  tipo: string | null;
}

interface Vista {
  racconto: Racconto;
  /** HTML di ogni scena (markdown reso), nell'ordine del testo. */
  scene: string[];
  righe: RigaUsata[];
}

/** `/racconto/:slug`: il testo in colonna di lettura; in testa titolo/universo/regione/sinossi, in coda righe usate e fatti. */
@Component({
  selector: 'app-racconto',
  imports: [RouterLink, BadgeUniverso],
  templateUrl: './racconto.html',
})
export class RaccontoPage {
  private readonly ledger = inject(Ledger);
  private readonly title = inject(Title);
  readonly slug = input.required<string>();
  readonly universoLabel = UNIVERSO_LABEL;

  readonly dati = resource({
    params: () => this.slug(),
    loader: async ({ params: slug }): Promise<Vista | null> => {
      const [racconto, index] = await Promise.all([this.ledger.racconto(slug), this.ledger.index()]);
      if (!racconto) return null;
      const byId = new Map<string, IndexEntry>(index.map((e) => [e.id, e]));
      return {
        racconto,
        scene: sceneDelTesto(racconto.corpo).map((s) => renderMarkdown(s)),
        righe: racconto.righe_usate.map((id) => ({
          id,
          titolo: byId.get(id)?.titolo ?? id,
          tipo: byId.get(id)?.tipo ?? null,
        })),
      };
    },
  });

  readonly vista = computed(() => (this.dati.hasValue() ? this.dati.value() : null));
  readonly nonTrovato = computed(() => this.dati.hasValue() && this.dati.value() === null);

  constructor() {
    effect(() => {
      const v = this.vista();
      this.title.setTitle(v ? `lore-ledger · ${v.racconto.titolo}` : `lore-ledger · racconto`);
    });
  }
}
