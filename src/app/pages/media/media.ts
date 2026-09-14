import { Component, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Ledger } from '../../data/ledger-api';
import { filtraMedia, linkSorgente, raggruppaMediaPerUniverso } from '../../data/ledger-logic';
import { MEDIA_LABEL, MEDIA_PLURALE, STRUMENTO_LABEL, UNIVERSO_LABEL, dimensioniMedia } from '../../data/labels';
import { MEDIA_TIPI, Media, MediaTipo, UNIVERSI, Universo } from '../../models/ledger';
import { BadgeUniverso } from '../../components/badges';

interface Tile {
  m: Media;
  link: string[];
  /** Titolo della sorgente (racconto o riga), se nell'indice; altrimenti lo slug/id. */
  sorgente: string;
  didascalia: string;
  alt: string;
  w: number;
  h: number;
}

interface Gruppo {
  universo: Universo;
  tiles: Tile[];
}

function isMediaTipo(v: string): v is MediaTipo {
  return (MEDIA_TIPI as readonly string[]).includes(v);
}

/** `/media`: tutti i media agganciati, a griglia per universo, con filtro per tipo. Prerenderizzata. */
@Component({
  selector: 'app-media',
  imports: [RouterLink, BadgeUniverso],
  templateUrl: './media.html',
})
export class MediaPage {
  private readonly ledger = inject(Ledger);
  readonly universi = UNIVERSI;
  readonly universoLabel = UNIVERSO_LABEL;
  readonly tipi = MEDIA_TIPI;
  readonly mediaPlurale = MEDIA_PLURALE;

  readonly dati = resource({
    loader: async () => {
      const [media, index, racconti] = await Promise.all([
        this.ledger.media(),
        this.ledger.index(),
        this.ledger.racconti(),
      ]);
      const titoli = new Map<string, string>();
      for (const e of index) titoli.set(e.id, e.titolo);
      for (const r of racconti) titoli.set(r.slug, r.titolo);
      return { media, titoli };
    },
  });

  readonly tutti = computed<Media[]>(() => (this.dati.hasValue() ? this.dati.value().media : []));
  readonly tipo = signal<MediaTipo | ''>('');
  readonly visibili = computed(() => filtraMedia(this.tutti(), this.tipo()));

  readonly gruppi = computed<Gruppo[]>(() => {
    const titoli = this.dati.hasValue() ? this.dati.value().titoli : new Map<string, string>();
    return raggruppaMediaPerUniverso(this.visibili()).map((g) => ({
      universo: g.universo,
      tiles: g.media.map((m) => {
        const [w, h] = dimensioniMedia(m.tipo, m.ar);
        const sorgente = titoli.get(m.sorgente.ref) ?? m.sorgente.ref;
        const strumento = STRUMENTO_LABEL[m.strumento] ?? m.strumento;
        return {
          m,
          link: linkSorgente(m),
          sorgente,
          didascalia: strumento ? `${MEDIA_LABEL[m.tipo]} · ${strumento}` : MEDIA_LABEL[m.tipo],
          alt: `${MEDIA_LABEL[m.tipo]} · ${sorgente}`,
          w,
          h,
        };
      }),
    }));
  });

  setTipo(ev: Event): void {
    const v = (ev.target as HTMLSelectElement).value;
    this.tipo.set(isMediaTipo(v) ? v : '');
  }
}
