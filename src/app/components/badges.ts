import { Component, computed, input } from '@angular/core';
import { Relazione, Tipo, Universo } from '../models/ledger';
import { RELAZIONE_LABEL, TIPO_LABEL, UNIVERSO_LABEL } from '../data/labels';

/** Badge testuale del tipo di riga (maiuscoletto mono). */
@Component({
  selector: 'app-badge-tipo',
  template: `<span class="badge badge-tipo">{{ label() }}</span>`,
})
export class BadgeTipo {
  readonly tipo = input.required<Tipo>();
  readonly label = computed(() => TIPO_LABEL[this.tipo()]);
}

/** Badge dell'universo: colore + nome, mai solo colore. */
@Component({
  selector: 'app-badge-universo',
  template: `<span class="badge badge-uni uni-{{ universo() }}">{{ label() }}</span>`,
})
export class BadgeUniverso {
  readonly universo = input.required<Universo>();
  readonly label = computed(() => UNIVERSO_LABEL[this.universo()]);
}

/** Badge della relazione con la madre; `null` → "radice" (riga senza madre). */
@Component({
  selector: 'app-badge-relazione',
  template: `<span class="badge badge-rel" [class.radice]="!relazione()">{{ label() }}</span>`,
})
export class BadgeRelazione {
  readonly relazione = input.required<Relazione | null>();
  readonly label = computed(() => {
    const r = this.relazione();
    return r ? RELAZIONE_LABEL[r] : 'radice';
  });
}

/** Segnalini booleani: proof of concept (invenzione) e prod (gadget). */
@Component({
  selector: 'app-badge-flag',
  template: `
    @if (poc()) {
      <span class="badge badge-flag">poc</span>
    }
    @if (prod()) {
      <span class="badge badge-flag">prod</span>
    }
  `,
})
export class BadgeFlag {
  readonly poc = input<boolean | undefined>(undefined);
  readonly prod = input<boolean | undefined>(undefined);
}
