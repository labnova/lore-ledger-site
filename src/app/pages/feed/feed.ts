import { Component, computed, inject, resource, signal } from '@angular/core';
import { Ledger } from '../../data/ledger-api';
import {
  FILTRO_VUOTO,
  FeedFilter,
  filterFeed,
  regioniDistinte,
  totaleRighe,
} from '../../data/ledger-logic';
import { RELAZIONE_LABEL, TIPO_LABEL, UNIVERSO_LABEL } from '../../data/labels';
import { IndexEntry, RELAZIONI, TIPI, UNIVERSI } from '../../models/ledger';
import { RigaCard } from '../../components/riga-card';

const BLOCCO = 50;

/** Snapshot incorporato nell'HTML dal prerender: le prime 50 righe, senza tutto l'indice. */
interface FeedSnapshot {
  righe: IndexEntry[];
  regioni: string[];
  totale: number;
}

@Component({
  selector: 'app-feed',
  imports: [RigaCard],
  templateUrl: './feed.html',
})
export class FeedPage {
  private readonly ledger = inject(Ledger);

  readonly tipi = TIPI;
  readonly universi = UNIVERSI;
  readonly relazioni = RELAZIONI;
  readonly tipoLabel = TIPO_LABEL;
  readonly universoLabel = UNIVERSO_LABEL;
  readonly relazioneLabel = RELAZIONE_LABEL;

  private readonly snap = this.ledger.snapshot<FeedSnapshot>('feed');

  readonly indice = resource({
    loader: async () => {
      const idx = await this.ledger.index();
      this.ledger.saveSnapshot<FeedSnapshot>('feed', {
        righe: idx.slice(0, BLOCCO),
        regioni: regioniDistinte(idx),
        totale: idx.length,
      });
      return idx;
    },
  });
  readonly stats = resource({ loader: () => this.ledger.stats() });

  /** Finché l'indice completo non è arrivato, si mostra lo snapshot del prerender. */
  readonly completo = computed(() => this.indice.hasValue());
  readonly righe = computed<IndexEntry[]>(() =>
    this.indice.hasValue() ? this.indice.value() : (this.snap?.righe ?? []),
  );
  readonly totale = computed(() =>
    this.indice.hasValue() ? this.indice.value().length : (this.snap?.totale ?? 0),
  );
  readonly regioni = computed(() =>
    this.indice.hasValue() ? regioniDistinte(this.indice.value()) : (this.snap?.regioni ?? []),
  );
  readonly totaleRighe = computed(() => (this.stats.hasValue() ? totaleRighe(this.stats.value()) : 0));

  // Filtri come signal, uno per campo.
  readonly tipo = signal<FeedFilter['tipo']>(FILTRO_VUOTO.tipo);
  readonly universo = signal<FeedFilter['universo']>(FILTRO_VUOTO.universo);
  readonly regione = signal(FILTRO_VUOTO.regione);
  readonly relazione = signal<FeedFilter['relazione']>(FILTRO_VUOTO.relazione);
  readonly soloPocProd = signal(FILTRO_VUOTO.soloPocProd);
  readonly testo = signal(FILTRO_VUOTO.testo);
  readonly limite = signal(BLOCCO);

  readonly filtro = computed<FeedFilter>(() => ({
    tipo: this.tipo(),
    universo: this.universo(),
    regione: this.regione(),
    relazione: this.relazione(),
    soloPocProd: this.soloPocProd(),
    testo: this.testo(),
  }));
  readonly filtroAttivo = computed(() => {
    const f = this.filtro();
    return !!(f.tipo || f.universo || f.regione || f.relazione || f.soloPocProd || f.testo.trim());
  });
  readonly filtrate = computed(() => filterFeed(this.righe(), this.filtro()));
  readonly visibili = computed(() => this.filtrate().slice(0, this.limite()));
  readonly altre = computed(() => Math.max(0, this.filtrate().length - this.visibili().length));

  set<K extends 'tipo' | 'universo' | 'regione' | 'relazione' | 'testo'>(k: K, ev: Event): void {
    const v = (ev.target as HTMLInputElement | HTMLSelectElement).value;
    // I select portano solo valori dell'enum corrispondente: il cast è sicuro.
    (this[k] as unknown as { set(v: string): void }).set(v);
    this.limite.set(BLOCCO);
  }

  toggleSoloPocProd(ev: Event): void {
    this.soloPocProd.set((ev.target as HTMLInputElement).checked);
    this.limite.set(BLOCCO);
  }

  azzera(): void {
    this.tipo.set('');
    this.universo.set('');
    this.regione.set('');
    this.relazione.set('');
    this.soloPocProd.set(false);
    this.testo.set('');
    this.limite.set(BLOCCO);
  }

  caricaAltre(): void {
    this.limite.update((n) => n + BLOCCO);
  }
}
