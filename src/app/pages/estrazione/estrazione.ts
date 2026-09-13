import { Component, computed, effect, inject, input, resource } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Ledger } from '../../data/ledger-api';
import {
  GruppoTipo,
  TestataEstrazione,
  raggruppaPerTipo,
  righeDiEstrazione,
  testataEstrazione,
} from '../../data/ledger-logic';
import { Estrazione, IndexEntry, Riga } from '../../models/ledger';
import { EstrazioneBlocco } from '../../components/estrazione-blocco';
import { BadgeTipo } from '../../components/badges';

interface Vista {
  estrazione: Estrazione;
  testata: TestataEstrazione;
  gruppi: GruppoTipo[];
  dettagli: Riga[];
  /** Righe pescate come canone (retrieve) risolte nell'indice; le assenti restano solo id. */
  pescato: { id: string; voce: IndexEntry | null }[];
  espansioni: { id: string; parent_id: string; voce: IndexEntry | null }[];
}

@Component({
  selector: 'app-estrazione',
  imports: [RouterLink, EstrazioneBlocco, BadgeTipo],
  templateUrl: './estrazione.html',
})
export class EstrazionePage {
  private readonly ledger = inject(Ledger);
  private readonly title = inject(Title);

  /** Dal parametro di route `:n`. */
  readonly n = input.required<string>();
  private readonly snap = computed(() => this.ledger.snapshot<Vista | null>(`e:${this.n()}`));

  readonly dati = resource({
    params: () => this.n(),
    loader: async ({ params }): Promise<Vista | null> => {
      const [estrazioni, index] = await Promise.all([this.ledger.estrazioni(), this.ledger.index()]);
      const e = estrazioni.find((x) => String(x.estrazione) === params) ?? null;
      if (!e) {
        this.ledger.saveSnapshot(`e:${params}`, null);
        return null;
      }
      const righe = righeDiEstrazione(e, index);
      const dett = await this.ledger.rows(righe.map((r) => r.id));
      const byId = new Map(index.map((x) => [x.id, x]));
      const v: Vista = {
        estrazione: e,
        testata: testataEstrazione(e, index),
        gruppi: raggruppaPerTipo(righe),
        dettagli: [...dett.values()],
        pescato: (e.canone_pescato ?? []).map((id) => ({ id, voce: byId.get(id) ?? null })),
        espansioni: (e.espansioni ?? []).map((x) => ({ ...x, voce: byId.get(x.id) ?? null })),
      };
      this.ledger.saveSnapshot(`e:${params}`, v);
      return v;
    },
  });

  readonly vista = computed<Vista | null>(() => (this.dati.hasValue() ? this.dati.value() : this.snap()));
  readonly nonTrovata = computed(() => this.dati.hasValue() && this.dati.value() === null);
  readonly dettagli = computed(() => new Map((this.vista()?.dettagli ?? []).map((r) => [r.id, r])));

  constructor() {
    effect(() => this.title.setTitle(`lore-ledger · estrazione #${this.n()}`));
  }
}
