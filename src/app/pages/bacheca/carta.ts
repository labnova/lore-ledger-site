import { Component, computed, effect, inject, input, resource } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Ledger } from '../../data/ledger-api';
import {
  Approfondimento,
  CommentoBacheca,
  NotaBacheca,
  approfondimentoDi,
  campiStatoBacheca,
  commentiDi,
  isBachecaId,
  linkArtefatto,
  notaDi,
} from '../../data/ledger-logic';
import { nomeAgente } from '../../data/labels';
import { Bacheca, isUniverso } from '../../models/ledger';
import { BadgeUniverso } from '../../components/badges';

interface Vista {
  carta: Bacheca;
  approfondimento: Approfondimento | null;
  nota: NotaBacheca | null;
  commenti: CommentoBacheca[];
  campi: { k: string; v: string }[];
  payloadGrezzo: string;
}

/**
 * `/b/:id`: scheda di una carta della bacheca. Resa sul client: legge `bacheca.json` a runtime,
 * così le carte create dopo la build si vedono senza ricostruire il sito.
 */
@Component({
  selector: 'app-carta-bacheca',
  imports: [RouterLink, BadgeUniverso],
  templateUrl: './carta.html',
})
export class CartaBachecaPage {
  private readonly ledger = inject(Ledger);
  private readonly title = inject(Title);
  readonly isUniverso = isUniverso;
  readonly nomeAgente = nomeAgente;
  readonly linkArtefatto = linkArtefatto;

  /** Dal parametro di route `:id`. */
  readonly id = input.required<string>();

  readonly dati = resource({
    params: () => this.id(),
    loader: async ({ params }): Promise<Vista | null> => {
      if (!isBachecaId(params)) return null;
      const carte = await this.ledger.bacheca();
      const carta = carte.find((c) => c.id === params) ?? null;
      if (!carta) return null;
      return {
        carta,
        approfondimento: carta.tipo === 'approfondimento' ? approfondimentoDi(carta) : null,
        nota: carta.tipo === 'nota' ? notaDi(carta) : null,
        commenti: commentiDi(carta.id, carte),
        campi: campiStatoBacheca(carta),
        payloadGrezzo: JSON.stringify(carta.payload, null, 2),
      };
    },
  });

  readonly vista = computed<Vista | null>(() => (this.dati.hasValue() ? this.dati.value() : null));
  readonly nonTrovata = computed(() => this.dati.hasValue() && this.dati.value() === null);

  constructor() {
    effect(() => this.title.setTitle(`lore-ledger · bacheca ${this.id()}`));
  }
}
