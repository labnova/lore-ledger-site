import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, PLATFORM_ID, TransferState, inject, makeStateKey } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { Estrazione, Graph, IndexEntry, Manifest, Racconto, RaccontoIndex, Riga, Stats, Universo } from '../models/ledger';
import {
  parseEstrazioni,
  parseGraph,
  parseIndex,
  parseManifest,
  parseRacconti,
  parseRacconto,
  parseRow,
  parseStats,
} from './ledger-logic';

/**
 * Accesso in sola lettura a `public/data/`. Ogni file viene scaricato una volta per sessione.
 *
 * I file piccoli (stats, manifest, bibbie) passano dalla transfer cache di HttpClient: il
 * prerender li incorpora nell'HTML e il client non li richiede. I file che crescono con il ledger
 * (index, graph, estrazioni) ne sono esclusi (vedi `app.config.ts`): le pagine prerenderizzate
 * salvano uno snapshot ridotto con `saveSnapshot` e lo rileggono con `snapshot` all'idratazione,
 * poi scaricano il file completo in background.
 */
@Injectable({ providedIn: 'root' })
export class Ledger {
  private readonly http = inject(HttpClient);
  private readonly transfer = inject(TransferState);
  readonly isServer = isPlatformServer(inject(PLATFORM_ID));
  private readonly cache = new Map<string, Promise<unknown>>();

  private json<T>(path: string, parse: (raw: unknown) => T): Promise<T> {
    let p = this.cache.get(path) as Promise<T> | undefined;
    if (!p) {
      p = firstValueFrom(this.http.get<unknown>(`/data/${path}`)).then(parse);
      this.cache.set(path, p);
    }
    return p;
  }

  index(): Promise<IndexEntry[]> {
    return this.json('index.json', parseIndex);
  }

  /** `null` se la riga non esiste (404) o non ha la forma minima. */
  row(id: string): Promise<Riga | null> {
    if (!/^[A-Z]{3}-[A-Z]{3}-[a-z0-9-]+$/.test(id)) return Promise.resolve(null);
    const key = `rows/${id}.json`;
    let p = this.cache.get(key) as Promise<Riga | null> | undefined;
    if (!p) {
      p = firstValueFrom(this.http.get<unknown>(`/data/${key}`))
        .then(parseRow)
        .catch((e: unknown) => {
          if (e instanceof HttpErrorResponse && e.status === 404) return null;
          throw e;
        });
      this.cache.set(key, p);
    }
    return p;
  }

  /** Racconti approvati (`racconti.json`); `[]` se il file non c'è ancora. */
  racconti(): Promise<RaccontoIndex[]> {
    const key = 'racconti.json';
    let p = this.cache.get(key) as Promise<RaccontoIndex[]> | undefined;
    if (!p) {
      p = firstValueFrom(this.http.get<unknown>(`/data/${key}`))
        .then(parseRacconti)
        .catch((e: unknown) => {
          if (e instanceof HttpErrorResponse && e.status === 404) return [];
          throw e;
        });
      this.cache.set(key, p);
    }
    return p;
  }

  /** `null` se il racconto non esiste (404) o non ha la forma minima. */
  racconto(slug: string): Promise<Racconto | null> {
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9-]+$/.test(slug)) return Promise.resolve(null);
    const key = `racconti/${slug}.json`;
    let p = this.cache.get(key) as Promise<Racconto | null> | undefined;
    if (!p) {
      p = firstValueFrom(this.http.get<unknown>(`/data/${key}`))
        .then(parseRacconto)
        .catch((e: unknown) => {
          if (e instanceof HttpErrorResponse && e.status === 404) return null;
          throw e;
        });
      this.cache.set(key, p);
    }
    return p;
  }

  graph(): Promise<Graph> {
    return this.json('graph.json', parseGraph);
  }

  estrazioni(): Promise<Estrazione[]> {
    return this.json('estrazioni.json', parseEstrazioni);
  }

  stats(): Promise<Stats> {
    return this.json('stats.json', parseStats);
  }

  manifest(): Promise<Manifest> {
    return this.json('manifest.json', parseManifest);
  }

  /** Righe complete per id; le mancanti (404 o non valide) vengono omesse. */
  async rows(ids: readonly string[]): Promise<Map<string, Riga>> {
    const unici = [...new Set(ids)];
    const righe = await Promise.all(unici.map((id) => this.row(id)));
    const out = new Map<string, Riga>();
    for (const r of righe) if (r) out.set(r.id, r);
    return out;
  }

  bibbia(universo: Universo): Promise<string> {
    const key = `bibbie/${universo}.md`;
    let p = this.cache.get(key) as Promise<string> | undefined;
    if (!p) {
      p = firstValueFrom(this.http.get(`/data/${key}`, { responseType: 'text' })).catch(
        (e: unknown) => {
          if (e instanceof HttpErrorResponse && e.status === 404) return '';
          throw e;
        },
      );
      this.cache.set(key, p);
    }
    return p;
  }

  /** Sul server: registra uno snapshot da incorporare nell'HTML prerenderizzato. Sul client: no-op. */
  saveSnapshot<T>(key: string, value: T): void {
    if (this.isServer) this.transfer.set(makeStateKey<T>(`snap:${key}`), value);
  }

  /** Sul client: legge (una volta) lo snapshot lasciato dal prerender, altrimenti `null`. */
  snapshot<T>(key: string): T | null {
    const k = makeStateKey<T | null>(`snap:${key}`);
    if (this.isServer || !this.transfer.hasKey(k)) return null;
    const v = this.transfer.get(k, null);
    this.transfer.remove(k);
    return v;
  }
}
