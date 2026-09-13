import { Component, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Ledger } from '../../data/ledger-api';
import { filtraRacconti } from '../../data/ledger-logic';
import { UNIVERSO_LABEL } from '../../data/labels';
import { RaccontoIndex, UNIVERSI, Universo, isUniverso } from '../../models/ledger';
import { BadgeUniverso } from '../../components/badges';

/** `/racconti`: elenco cronologico inverso dei racconti approvati, con filtro per universo. Prerenderizzata. */
@Component({
  selector: 'app-racconti',
  imports: [RouterLink, BadgeUniverso],
  templateUrl: './racconti.html',
})
export class RaccontiPage {
  private readonly ledger = inject(Ledger);
  readonly universi = UNIVERSI;
  readonly universoLabel = UNIVERSO_LABEL;

  readonly dati = resource({ loader: () => this.ledger.racconti() });
  readonly tutti = computed<RaccontoIndex[]>(() => (this.dati.hasValue() ? this.dati.value() : []));

  readonly universo = signal<Universo | ''>('');
  readonly visibili = computed(() => filtraRacconti(this.tutti(), this.universo()));

  setUniverso(ev: Event): void {
    const v = (ev.target as HTMLSelectElement).value;
    this.universo.set(isUniverso(v) ? v : '');
  }
}
