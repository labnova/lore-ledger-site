import { Component, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Ledger } from '../../data/ledger-api';
import { chiaviPiatte, righeDiEstrazione } from '../../data/ledger-logic';
import { UNIVERSO_LABEL } from '../../data/labels';
import { Estrazione, IndexEntry, isUniverso } from '../../models/ledger';
import { BadgeUniverso } from '../../components/badges';
import { RigaCard } from '../../components/riga-card';

const BLOCCO = 50;

interface EstrazioniSnapshot {
  prime: Estrazione[];
  totale: number;
}

@Component({
  selector: 'app-estrazioni',
  imports: [RouterLink, BadgeUniverso, RigaCard],
  templateUrl: './estrazioni.html',
})
export class EstrazioniPage {
  private readonly ledger = inject(Ledger);
  readonly universoLabel = UNIVERSO_LABEL;
  readonly isUniverso = isUniverso;
  readonly chiaviPiatte = chiaviPiatte;

  private readonly snap = this.ledger.snapshot<EstrazioniSnapshot>('e');

  readonly tutte = resource({
    loader: async () => {
      const e = await this.ledger.estrazioni();
      this.ledger.saveSnapshot<EstrazioniSnapshot>('e', { prime: e.slice(0, BLOCCO), totale: e.length });
      return e;
    },
  });

  readonly righe = computed<Estrazione[]>(() =>
    this.tutte.hasValue() ? this.tutte.value() : (this.snap?.prime ?? []),
  );
  readonly totale = computed(() =>
    this.tutte.hasValue() ? this.tutte.value().length : (this.snap?.totale ?? 0),
  );
  readonly limite = signal(BLOCCO);
  readonly visibili = computed(() => this.righe().slice(0, this.limite()));
  readonly altre = computed(() => Math.max(0, this.righe().length - this.visibili().length));

  /** Estrazione aperta (numero) per mostrare le righe prodotte. */
  readonly aperta = signal<number | null>(null);
  /** L'indice serve solo per le righe prodotte: si scarica al primo clic. */
  private readonly vuoleIndice = signal(false);
  readonly indice = resource({
    params: () => (this.vuoleIndice() ? true : undefined),
    loader: () => this.ledger.index(),
  });

  readonly righeAperte = computed<IndexEntry[]>(() => {
    const n = this.aperta();
    if (n === null || !this.indice.hasValue()) return [];
    const e = this.righe().find((x) => x.estrazione === n);
    return e ? righeDiEstrazione(e, this.indice.value()) : [];
  });

  toggle(n: number): void {
    this.vuoleIndice.set(true);
    this.aperta.update((a) => (a === n ? null : n));
  }

  caricaAltre(): void {
    this.limite.update((n) => n + BLOCCO);
  }

  universoDi(e: Estrazione): string | null {
    const u = e.chiavi['universo'];
    return typeof u === 'string' ? u : null;
  }
}
