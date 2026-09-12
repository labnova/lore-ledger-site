import { Component, computed, signal } from '@angular/core';
import { EDGE_KINDS, EdgeKind, UNIVERSI, Universo } from '../../models/ledger';
import { UNIVERSO_LABEL } from '../../data/labels';
import { GrafoCanvas } from './grafo-canvas';

export const KIND_LABEL: Record<EdgeKind, string> = {
  parent: 'madre → figlia',
  invenzione: 'usa l’invenzione',
  personaggio: 'portato dal personaggio',
  sorgente: 'contenuto ← sorgente',
  regione: 'sta nella regione',
};

@Component({
  selector: 'app-grafo',
  imports: [GrafoCanvas],
  templateUrl: './grafo.html',
})
export class GrafoPage {
  readonly universi = UNIVERSI;
  readonly universoLabel = UNIVERSO_LABEL;
  readonly kinds = EDGE_KINDS;
  readonly kindLabel = KIND_LABEL;

  readonly universo = signal<Universo | ''>('');
  readonly attivi = signal<Set<EdgeKind>>(new Set(EDGE_KINDS));
  readonly kindsAttivi = computed(() => this.kinds.filter((k) => this.attivi().has(k)));

  setUniverso(ev: Event): void {
    this.universo.set((ev.target as HTMLSelectElement).value as Universo | '');
  }

  toggleKind(k: EdgeKind, ev: Event): void {
    const on = (ev.target as HTMLInputElement).checked;
    this.attivi.update((s) => {
      const n = new Set(s);
      if (on) n.add(k);
      else n.delete(k);
      return n;
    });
  }
}
