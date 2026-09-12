import { Component, computed, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Ledger } from '../../data/ledger-api';
import { totaleRighe } from '../../data/ledger-logic';
import { TIPO_PLURALE, UNIVERSO_LABEL } from '../../data/labels';
import { TIPI, UNIVERSI } from '../../models/ledger';

@Component({
  selector: 'app-macchina',
  imports: [RouterLink],
  template: `
    <h1>La macchina</h1>
    <p class="muted">Come nasce ogni riga del ledger, e da dove arrivano i dati di questo sito.</p>

    @if (manifest.hasValue() || stats.hasValue()) {
      <dl class="stats" aria-label="Stato del build">
        @if (manifest.hasValue()) {
          @let m = manifest.value();
          <div class="stat">
            <dt>build dei dati</dt>
            <dd>{{ m.build }}</dd>
          </div>
          <div class="stat">
            <dt>commit del ledger</dt>
            <dd>{{ m.commit }}</dd>
          </div>
          <div class="stat">
            <dt>versione schema</dt>
            <dd>{{ m.schema_version }}</dd>
          </div>
        }
        @if (stats.hasValue()) {
          @let s = stats.value();
          <div class="stat">
            <dt>righe totali</dt>
            <dd>{{ totale() }}</dd>
          </div>
          <div class="stat">
            <dt>estrazioni</dt>
            <dd>{{ s.estrazioni_totali }}</dd>
          </div>
          <div class="stat">
            <dt>ultima generazione</dt>
            <dd>{{ s.ultima_generazione ?? '—' }}</dd>
          </div>
        }
      </dl>
    }

    @if (stats.hasValue()) {
      @let s = stats.value();
      <div class="tabella-wrap">
        <table>
          <caption class="visually-hidden">Righe per tipo e per universo</caption>
          <thead>
            <tr>
              <th scope="col">per tipo</th>
              <th scope="col">righe</th>
              <th scope="col">per universo</th>
              <th scope="col">righe</th>
              <th scope="col">regioni</th>
            </tr>
          </thead>
          <tbody>
            @for (i of indici; track i) {
              <tr>
                <td class="mono">{{ tipi[i] ? tipoPlurale[tipi[i]] : '' }}</td>
                <td class="mono">{{ tipi[i] ? (s.righe_per_tipo[tipi[i]] ?? 0) : '' }}</td>
                <td>
                  @if (universi[i]) {
                    <a [routerLink]="['/u', universi[i]]">{{ universoLabel[universi[i]] }}</a>
                  }
                </td>
                <td class="mono">{{ universi[i] ? (s.righe_per_universo[universi[i]] ?? 0) : '' }}</td>
                <td class="mono">{{ universi[i] ? (s.regioni_per_universo[universi[i]] ?? 0) : '' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <div class="prosa">
      <h2>Come funziona</h2>
      <p>
        lore-ledger è una casa editrice agentica. Non c'è una redazione: c'è un registro, il
        ledger, un generatore di casualità e quattro lotti che girano a orari fissi. Il curatore
        legge un digest serale e può forzare un'estrazione; non riscrive niente.
      </p>
      <h3>Estrazione uniforme</h3>
      <p>
        Ogni lotto parte da un'estrazione con un CSPRNG (<code>secrets.SystemRandom</code>),
        distribuzione uniforme: nessun peso, nessuna preferenza. Le chiavi uscite (universo,
        discipline, casta, regione, sorgente, formato) vengono scritte in un log numerato prima che
        esista una sola parola di testo. Se il curatore fissa un campo, il log lo dichiara come
        <em>forzata</em> e elenca i campi fissati. Il log è la pagina <a routerLink="/e">estrazioni</a>.
      </p>
      <h3>Quattro lotti orari</h3>
      <p>
        Ogni ora, in base all'ora di Roma modulo quattro: lore (invenzioni), personaggi, gadget,
        contenuti. Il lotto legge tre righe già canoniche e due paragrafi della bibbia dell'universo
        estratto. Se tra le tre righe pesca un'invenzione o un personaggio, deve produrre una figlia
        con relazione «espansione».
      </p>
      <h3>Madre e figlia</h3>
      <p>
        Nessuna riga viene modificata o cancellata. Una variante è una riga nuova, con
        <code>parent_id</code> e una <code>relazione</code>: dialetto, evoluzione, vecchia
        timeline, corruzione, espansione, adattamento, materializzazione. La storia del ledger si
        legge risalendo le madri; il <a routerLink="/g">grafo</a> la disegna.
      </p>
      <h3>Append-only, canone alla nascita</h3>
      <p>
        Una riga che valida contro lo schema del suo tipo è canone dal momento in cui viene scritta:
        non c'è approvazione umana. Una riga che non valida finisce in quarantena e non entra mai.
        Un solo commit per lotto, fatto dal workflow.
      </p>
      <h3>Questo sito</h3>
      <p>
        Il repo privato compila il ledger in JSON statico e lo spinge qui; il sito lo legge e
        basta. Build e commit qui sopra dicono quale versione del ledger stai guardando.
      </p>
    </div>
  `,
})
export class MacchinaPage {
  private readonly ledger = inject(Ledger);
  readonly manifest = resource({ loader: () => this.ledger.manifest() });
  readonly stats = resource({ loader: () => this.ledger.stats() });
  readonly totale = computed(() => (this.stats.hasValue() ? totaleRighe(this.stats.value()) : 0));
  readonly tipi = TIPI;
  readonly universi = UNIVERSI;
  readonly indici = [0, 1, 2, 3, 4];
  readonly tipoPlurale = TIPO_PLURALE;
  readonly universoLabel = UNIVERSO_LABEL;
}
