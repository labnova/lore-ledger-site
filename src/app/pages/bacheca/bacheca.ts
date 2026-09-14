import { Component, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Ledger } from '../../data/ledger-api';
import { Bacheca, isUniverso } from '../../models/ledger';
import { notaDi, notePerBersaglio } from '../../data/ledger-logic';
import { nomeAgente } from '../../data/labels';
import { BadgeUniverso } from '../../components/badges';

/** `/b`: bacheca delle richieste da `bacheca.json`, tabella con filtro per stato. Prerenderizzata. */
@Component({
  selector: 'app-bacheca',
  imports: [RouterLink, BadgeUniverso],
  templateUrl: './bacheca.html',
})
export class BachecaPage {
  private readonly ledger = inject(Ledger);
  readonly isUniverso = isUniverso;
  readonly nomeAgente = nomeAgente;
  readonly notaDi = notaDi;

  readonly dati = resource({ loader: () => this.ledger.bachecaConData() });

  readonly tutte = computed<Bacheca[]>(() => (this.dati.hasValue() ? this.dati.value().carte : []));
  /** Data di generazione di `bacheca.json` (Last-Modified), per capire quanto è vecchio il dato. */
  readonly generato = computed(() => (this.dati.hasValue() ? this.dati.value().generato : null));
  readonly stati = computed(() =>
    [
      ...new Set(
        this.tutte()
          .map((b) => b.stato)
          .filter(Boolean),
      ),
    ].sort(),
  );
  readonly tipi = computed(() =>
    [
      ...new Set(
        this.tutte()
          .map((b) => b.tipo)
          .filter(Boolean),
      ),
    ].sort(),
  );
  readonly stato = signal('');
  readonly tipo = signal('');
  /** `tabella` (tutte le carte) oppure `bersagli` (solo le note, raggruppate per bersaglio). */
  readonly vista = signal<'tabella' | 'bersagli'>('tabella');
  readonly visibili = computed(() => {
    const s = this.stato();
    const t = this.tipo();
    return this.tutte().filter((b) => (!s || b.stato === s) && (!t || b.tipo === t));
  });
  readonly bersagli = computed(() => notePerBersaglio(this.visibili()));

  setStato(ev: Event): void {
    this.stato.set((ev.target as HTMLSelectElement).value);
  }

  setTipo(ev: Event): void {
    this.tipo.set((ev.target as HTMLSelectElement).value);
  }

  setVista(ev: Event): void {
    this.vista.set((ev.target as HTMLSelectElement).value === 'bersagli' ? 'bersagli' : 'tabella');
  }
}
