import { Component, computed, effect, inject, input, resource } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Ledger } from '../../data/ledger-api';
import {
  Collegamenti,
  Lineage,
  pescataIn,
  resolveCollegamenti,
  resolveLineage,
  resolveRegione,
} from '../../data/ledger-logic';
import {
  ASSI_PERSONAGGIO,
  CAMPI_COMUNI,
  CAMPI_LINK,
  CAMPI_MONO,
  CAMPI_TIPO,
  CAMPO_LABEL,
  RELAZIONE_LABEL,
  UNIVERSO_LABEL,
  snake,
} from '../../data/labels';
import { Estrazione, IndexEntry, Personaggio, Riga } from '../../models/ledger';
import { BadgeFlag, BadgeRelazione, BadgeTipo, BadgeUniverso } from '../../components/badges';
import { RigaCard } from '../../components/riga-card';

interface Campo {
  k: string;
  label: string;
  testo: string;
  mono: boolean;
  /** Route a cui porta il valore (altra riga, universo, estrazione). */
  link: string[] | null;
  fragment?: string;
  /** Titolo della riga collegata, se nell'indice. */
  titoloLink?: string;
}

interface Vista {
  riga: Riga;
  titolo: string;
  lineage: Lineage;
  regione: IndexEntry | null;
  coll: Collegamenti;
  pescata: Estrazione[];
  byId: Map<string, IndexEntry>;
}

function titoloDi(r: Riga): string {
  if (r.tipo === 'personaggio') return `${r.nome} ${r.cognome}`.trim();
  if (r.tipo === 'contenuto') return r.titolo;
  return r.nome;
}

function testoDi(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'sì' : 'no';
  if (Array.isArray(v)) return v.map(testoDi).join(' · ');
  if (typeof v === 'object') {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => `${snake(k)}: ${testoDi(x)}`)
      .join(' · ');
  }
  return String(v);
}

@Component({
  selector: 'app-riga',
  imports: [RouterLink, BadgeTipo, BadgeUniverso, BadgeRelazione, BadgeFlag, RigaCard],
  templateUrl: './riga.html',
})
export class RigaPage {
  private readonly ledger = inject(Ledger);
  private readonly title = inject(Title);

  readonly id = input.required<string>();
  readonly relazioneLabel = RELAZIONE_LABEL;
  readonly universoLabel = UNIVERSO_LABEL;
  readonly campoLabel = CAMPO_LABEL;
  readonly assi = ASSI_PERSONAGGIO;

  readonly dati = resource({
    params: () => this.id(),
    loader: async ({ params: id }): Promise<Vista | null> => {
      const [riga, index, graph, estrazioni] = await Promise.all([
        this.ledger.row(id),
        this.ledger.index(),
        this.ledger.graph(),
        this.ledger.estrazioni(),
      ]);
      if (!riga) return null;
      return {
        riga,
        titolo: titoloDi(riga),
        lineage: resolveLineage(riga, index),
        regione: resolveRegione(riga, index),
        coll: resolveCollegamenti(riga.id, graph, index),
        pescata: pescataIn(riga.id, estrazioni),
        byId: new Map(index.map((e) => [e.id, e])),
      };
    },
  });

  readonly vista = computed(() => (this.dati.hasValue() ? this.dati.value() : null));
  readonly nonTrovata = computed(() => this.dati.hasValue() && this.dati.value() === null);

  readonly personaggio = computed<Personaggio | null>(() => {
    const v = this.vista();
    return v && v.riga.tipo === 'personaggio' ? v.riga : null;
  });

  /** Tutti i campi con etichetta, nell'ordine del tipo; per i personaggi gli assi vanno a parte. */
  readonly campi = computed<Campo[]>(() => {
    const v = this.vista();
    if (!v) return [];
    const r = v.riga as unknown as Record<string, unknown>;
    const esclusi = new Set<string>(
      v.riga.tipo === 'personaggio' ? [...ASSI_PERSONAGGIO, 'contraddizione'] : [],
    );
    const chiavi = [...CAMPI_TIPO[v.riga.tipo], ...CAMPI_COMUNI].filter(
      (k) => k in r && !esclusi.has(k),
    );
    return chiavi.map((k) => this.campo(k, r[k], v));
  });

  private campo(k: string, val: unknown, v: Vista): Campo {
    const c: Campo = {
      k,
      label: CAMPO_LABEL[k] ?? snake(k),
      testo: testoDi(val),
      mono: CAMPI_MONO.has(k),
      link: null,
    };
    if (typeof val === 'string' && CAMPI_LINK.has(k)) {
      c.link = ['/r', val];
      c.titoloLink = v.byId.get(val)?.titolo;
    } else if (k === 'universo' && typeof val === 'string') {
      c.link = ['/u', val];
      c.testo = UNIVERSO_LABEL[v.riga.universo];
    } else if (k === 'regione' && v.regione) {
      c.link = ['/r', v.regione.id];
      c.titoloLink = v.regione.id;
    } else if (k === 'estrazione' && typeof val === 'number') {
      c.link = ['/e'];
      c.fragment = `e-${val}`;
      c.testo = `#${val}`;
    } else if (k === 'relazione' && typeof val === 'string') {
      c.testo = RELAZIONE_LABEL[v.riga.relazione!] ?? val;
    } else if (typeof val === 'string' && c.mono) {
      c.testo = snake(val);
    }
    return c;
  }

  constructor() {
    effect(() => {
      const v = this.vista();
      this.title.setTitle(
        v ? `lore-ledger · ${v.titolo} (${v.riga.id})` : `lore-ledger · ${this.id()}`,
      );
    });
  }
}
