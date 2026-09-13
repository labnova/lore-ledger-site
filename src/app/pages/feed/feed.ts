import { Component, computed, effect, inject, resource, signal, untracked } from '@angular/core';
import { Ledger } from '../../data/ledger-api';
import {
  FILTRO_VUOTO,
  FeedFilter,
  GruppoEstrazione,
  TestataEstrazione,
  filterFeed,
  raggruppaPerEstrazione,
  regioniDistinte,
  testataEstrazione,
  totaleRighe,
} from '../../data/ledger-logic';
import { RELAZIONE_LABEL, TIPO_LABEL, UNIVERSO_LABEL } from '../../data/labels';
import { Estrazione, IndexEntry, RELAZIONI, Riga, TIPI, UNIVERSI } from '../../models/ledger';
import { RigaCard } from '../../components/riga-card';
import { EstrazioneBlocco } from '../../components/estrazione-blocco';

const BLOCCO = 50;
const BLOCCO_ESTRAZIONI = 3;
type Vista = 'righe' | 'estrazioni';

/** Snapshot incorporato nell'HTML dal prerender: solo ciò che serve alla prima vista. */
interface FeedSnapshot {
  righe: IndexEntry[];
  estrazioni: Estrazione[];
  dettagli: Riga[];
  regioni: string[];
  totale: number;
}

@Component({
  selector: 'app-feed',
  imports: [RigaCard, EstrazioneBlocco],
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

  readonly base = resource({
    loader: async () => {
      const [idx, estr] = await Promise.all([this.ledger.index(), this.ledger.estrazioni()]);
      return { idx, estr };
    },
  });
  readonly stats = resource({ loader: () => this.ledger.stats() });

  /** Finché l'indice completo non è arrivato, si mostra lo snapshot del prerender. */
  readonly completo = computed(() => this.base.hasValue());
  readonly righe = computed<IndexEntry[]>(() =>
    this.base.hasValue() ? this.base.value().idx : (this.snap?.righe ?? []),
  );
  readonly estrazioni = computed<Estrazione[]>(() =>
    this.base.hasValue() ? this.base.value().estr : (this.snap?.estrazioni ?? []),
  );
  readonly totale = computed(() =>
    this.base.hasValue() ? this.base.value().idx.length : (this.snap?.totale ?? 0),
  );
  readonly regioni = computed(() =>
    this.base.hasValue() ? regioniDistinte(this.base.value().idx) : (this.snap?.regioni ?? []),
  );
  readonly totaleRighe = computed(() => (this.stats.hasValue() ? totaleRighe(this.stats.value()) : 0));

  // Vista e filtri come signal.
  readonly vista = signal<Vista>('estrazioni');
  readonly tipo = signal<FeedFilter['tipo']>(FILTRO_VUOTO.tipo);
  readonly universo = signal<FeedFilter['universo']>(FILTRO_VUOTO.universo);
  readonly regione = signal(FILTRO_VUOTO.regione);
  readonly relazione = signal<FeedFilter['relazione']>(FILTRO_VUOTO.relazione);
  readonly soloPocProd = signal(FILTRO_VUOTO.soloPocProd);
  readonly testo = signal(FILTRO_VUOTO.testo);
  readonly limite = signal(BLOCCO);
  readonly limiteGruppi = signal(BLOCCO_ESTRAZIONI);

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

  // Vista righe.
  readonly visibili = computed(() => this.filtrate().slice(0, this.limite()));
  readonly altre = computed(() => Math.max(0, this.filtrate().length - this.visibili().length));

  // Vista estrazioni.
  readonly gruppiTutti = computed<GruppoEstrazione[]>(() => raggruppaPerEstrazione(this.filtrate()));
  readonly gruppi = computed(() => this.gruppiTutti().slice(0, this.limiteGruppi()));
  readonly altriGruppi = computed(() => Math.max(0, this.gruppiTutti().length - this.gruppi().length));
  readonly estrazioneDi = computed(() => new Map(this.estrazioni().map((e) => [e.estrazione, e])));
  readonly testate = computed<Map<number, TestataEstrazione>>(() => {
    const idx = this.righe();
    const out = new Map<number, TestataEstrazione>();
    for (const g of this.gruppi()) {
      const e = this.estrazioneDi().get(g.n);
      out.set(g.n, e ? testataEstrazione(e, idx) : { n: g.n, universo: null, regione: null, regioneNome: null, invenzione: null });
    }
    return out;
  });
  /** Estrazione sintetica quando il log non ha ancora la voce (righe arrivate prima del log). */
  estrazioneOVuota(n: number): Estrazione {
    return (
      this.estrazioneDi().get(n) ?? {
        estrazione: n,
        lotto: '',
        created: '',
        esito: '',
        forzata: false,
        campi_forzati: [],
        chiavi: {},
      }
    );
  }

  // Righe complete per le card visibili: gancio intero e chiavi in chiaro.
  readonly idsVisibili = computed(() =>
    this.vista() === 'righe'
      ? this.visibili().map((r) => r.id)
      : this.gruppi().flatMap((g) => g.righe.map((r) => r.id)),
  );
  readonly dettagli = signal<Map<string, Riga>>(new Map((this.snap?.dettagli ?? []).map((r) => [r.id, r])));
  private readonly mancanti = computed(() =>
    this.idsVisibili()
      .filter((id) => !this.dettagli().has(id))
      .join(','),
  );
  readonly dettagliRes = resource({
    params: () => this.mancanti(),
    loader: async ({ params }) => {
      if (!params) return new Map<string, Riga>();
      const m = await this.ledger.rows(params.split(','));
      if (this.ledger.isServer) this.salvaSnapshot(m);
      return m;
    },
  });

  constructor() {
    effect(() => {
      if (!this.dettagliRes.hasValue()) return;
      const nuovi = this.dettagliRes.value();
      if (!nuovi.size) return;
      untracked(() => this.dettagli.update((d) => new Map([...d, ...nuovi])));
    });
  }

  private salvaSnapshot(nuovi: Map<string, Riga>): void {
    const righe = this.vista() === 'righe' ? this.visibili() : this.gruppi().flatMap((g) => g.righe);
    const numeri = new Set(righe.map((r) => r.estrazione));
    this.ledger.saveSnapshot<FeedSnapshot>('feed', {
      righe,
      estrazioni: this.estrazioni().filter((e) => numeri.has(e.estrazione)),
      dettagli: [...new Map([...untracked(() => this.dettagli()), ...nuovi]).values()],
      regioni: this.regioni(),
      totale: this.totale(),
    });
  }

  setVista(v: Vista): void {
    this.vista.set(v);
  }

  set<K extends 'tipo' | 'universo' | 'regione' | 'relazione' | 'testo'>(k: K, ev: Event): void {
    const v = (ev.target as HTMLInputElement | HTMLSelectElement).value;
    // I select portano solo valori dell'enum corrispondente: il cast è sicuro.
    (this[k] as unknown as { set(v: string): void }).set(v);
    this.azzeraLimiti();
  }

  toggleSoloPocProd(ev: Event): void {
    this.soloPocProd.set((ev.target as HTMLInputElement).checked);
    this.azzeraLimiti();
  }

  azzera(): void {
    this.tipo.set('');
    this.universo.set('');
    this.regione.set('');
    this.relazione.set('');
    this.soloPocProd.set(false);
    this.testo.set('');
    this.azzeraLimiti();
  }

  private azzeraLimiti(): void {
    this.limite.set(BLOCCO);
    this.limiteGruppi.set(BLOCCO_ESTRAZIONI);
  }

  caricaAltre(): void {
    this.limite.update((n) => n + BLOCCO);
  }

  caricaAltriGruppi(): void {
    this.limiteGruppi.update((n) => n + BLOCCO_ESTRAZIONI);
  }
}
