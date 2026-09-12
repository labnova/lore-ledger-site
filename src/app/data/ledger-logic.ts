/**
 * Funzioni pure sul contratto dati: nessuna dipendenza da Angular, testabili in isolamento.
 */
import {
  EDGE_KINDS,
  Estrazione,
  Graph,
  GraphEdge,
  IndexEntry,
  Manifest,
  Relazione,
  Riga,
  Stats,
  Tipo,
  Universo,
  isTipo,
  isUniverso,
} from '../models/ledger';

// ---------------------------------------------------------------------------
// Parsing: i JSON arrivano da un altro repo; si controlla la forma minima e si
// scartano le voci malformate invece di far cadere la pagina.
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isIndexEntry(v: unknown): v is IndexEntry {
  return (
    isRecord(v) &&
    typeof v['id'] === 'string' &&
    isTipo(v['tipo']) &&
    isUniverso(v['universo']) &&
    typeof v['created'] === 'string' &&
    typeof v['titolo'] === 'string'
  );
}

/** Legge `index.json`; le voci non conformi vengono scartate. Ordine: `created` desc, poi id desc. */
export function parseIndex(raw: unknown): IndexEntry[] {
  if (!Array.isArray(raw)) return [];
  const out = raw.filter(isIndexEntry).map((e) => ({
    ...e,
    estrazione: typeof e.estrazione === 'number' ? e.estrazione : 0,
    parent_id: e.parent_id ?? null,
    relazione: e.relazione ?? null,
    regione: e.regione ?? null,
    sommario: e.sommario ?? '',
  }));
  return sortByCreatedDesc(out);
}

/** Legge `rows/<id>.json`; ritorna `null` se la riga non ha la forma minima. */
export function parseRow(raw: unknown): Riga | null {
  if (!isRecord(raw)) return null;
  if (typeof raw['id'] !== 'string' || !isTipo(raw['tipo']) || !isUniverso(raw['universo'])) {
    return null;
  }
  return raw as unknown as Riga;
}

export function parseGraph(raw: unknown): Graph {
  if (!isRecord(raw)) return { nodes: [], edges: [] };
  const nodes = Array.isArray(raw['nodes'])
    ? raw['nodes'].filter(
        (n): n is Graph['nodes'][number] =>
          isRecord(n) && typeof n['id'] === 'string' && isTipo(n['tipo']) && isUniverso(n['universo']),
      )
    : [];
  const ids = new Set(nodes.map((n) => n.id));
  const edges = Array.isArray(raw['edges'])
    ? raw['edges'].filter(
        (e): e is GraphEdge =>
          isRecord(e) &&
          typeof e['from'] === 'string' &&
          typeof e['to'] === 'string' &&
          (EDGE_KINDS as string[]).includes(String(e['kind'])) &&
          ids.has(e['from']) &&
          ids.has(e['to']),
      )
    : [];
  return { nodes, edges };
}

export function parseEstrazioni(raw: unknown): Estrazione[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is Estrazione => isRecord(e) && typeof e['estrazione'] === 'number')
    .map((e) => ({
      ...e,
      lotto: String(e.lotto ?? ''),
      esito: String(e.esito ?? ''),
      forzata: e.forzata === true,
      campi_forzati: Array.isArray(e.campi_forzati) ? e.campi_forzati.map(String) : [],
      chiavi: isRecord(e.chiavi) ? e.chiavi : {},
    }))
    .sort((a, b) => b.estrazione - a.estrazione);
}

export function parseStats(raw: unknown): Stats {
  const r = isRecord(raw) ? raw : {};
  const rec = (k: string) => (isRecord(r[k]) ? (r[k] as Record<string, number>) : {});
  return {
    righe_per_tipo: rec('righe_per_tipo'),
    righe_per_universo: rec('righe_per_universo'),
    regioni_per_universo: rec('regioni_per_universo'),
    ultima_generazione: typeof r['ultima_generazione'] === 'string' ? r['ultima_generazione'] : null,
    estrazioni_totali: typeof r['estrazioni_totali'] === 'number' ? r['estrazioni_totali'] : 0,
    ultimo_build: typeof r['ultimo_build'] === 'string' ? r['ultimo_build'] : '',
  };
}

export function parseManifest(raw: unknown): Manifest {
  const r = isRecord(raw) ? raw : {};
  return {
    build: typeof r['build'] === 'string' ? r['build'] : '',
    commit: typeof r['commit'] === 'string' ? r['commit'] : 'unknown',
    schema_version: typeof r['schema_version'] === 'number' ? r['schema_version'] : 0,
  };
}

export function totaleRighe(stats: Stats): number {
  return Object.values(stats.righe_per_tipo).reduce<number>((a, b) => a + (b ?? 0), 0);
}

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

export interface FeedFilter {
  tipo: Tipo | '';
  universo: Universo | '';
  regione: string;
  /** `''` tutte, `'nessuna'` solo righe radice, altrimenti una relazione. */
  relazione: Relazione | 'nessuna' | '';
  soloPocProd: boolean;
  testo: string;
}

export const FILTRO_VUOTO: FeedFilter = {
  tipo: '',
  universo: '',
  regione: '',
  relazione: '',
  soloPocProd: false,
  testo: '',
};

export function sortByCreatedDesc<T extends { created: string; id: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.created !== b.created) return a.created < b.created ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

/** Minuscole e senza accenti, per confronti tolleranti. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Applica i filtri del feed. Il testo cerca in id, titolo, sommario e regione. */
export function filterFeed(rows: IndexEntry[], f: FeedFilter): IndexEntry[] {
  const testo = norm(f.testo.trim());
  const regione = norm(f.regione.trim());
  return rows.filter((r) => {
    if (f.tipo && r.tipo !== f.tipo) return false;
    if (f.universo && r.universo !== f.universo) return false;
    if (regione && norm(r.regione ?? '') !== regione) return false;
    if (f.relazione === 'nessuna' && r.relazione !== null) return false;
    if (f.relazione && f.relazione !== 'nessuna' && r.relazione !== f.relazione) return false;
    if (f.soloPocProd && !(r.poc === true || r.prod === true)) return false;
    if (testo) {
      const hay = norm([r.id, r.titolo, r.sommario, r.regione ?? ''].join(' '));
      if (!hay.includes(testo)) return false;
    }
    return true;
  });
}

/** Regioni distinte (per nome) presenti nell'indice, per popolare il filtro. */
export function regioniDistinte(rows: IndexEntry[]): string[] {
  const set = new Set<string>();
  for (const r of rows) if (r.regione) set.add(r.regione);
  return [...set].sort((a, b) => a.localeCompare(b, 'it'));
}

// ---------------------------------------------------------------------------
// Madre / figlie / collegamenti
// ---------------------------------------------------------------------------

export interface Lineage {
  madre: IndexEntry | null;
  /** Il parent_id c'è ma la madre non è nell'indice (riga saltata o non ancora pubblicata). */
  madreMancante: string | null;
  figlie: IndexEntry[];
}

export function resolveLineage(
  riga: { id: string; parent_id: string | null },
  index: IndexEntry[],
): Lineage {
  const byId = new Map(index.map((e) => [e.id, e]));
  const madre = riga.parent_id ? (byId.get(riga.parent_id) ?? null) : null;
  return {
    madre,
    madreMancante: riga.parent_id && !madre ? riga.parent_id : null,
    figlie: sortByCreatedDesc(index.filter((e) => e.parent_id === riga.id)),
  };
}

/**
 * Risolve la regione di una riga. Le righe portano il nome (es. "Calvenna"), i log delle
 * estrazioni l'id (`NEO-REG-calvenna`): si accettano entrambi, nello stesso universo.
 */
export function resolveRegione(
  riga: { universo: Universo; regione: string | null },
  index: IndexEntry[],
): IndexEntry | null {
  if (!riga.regione) return null;
  const key = riga.regione.toLowerCase();
  return (
    index.find(
      (e) =>
        e.tipo === 'regione' &&
        e.universo === riga.universo &&
        (e.id.toLowerCase() === key || e.titolo.toLowerCase() === key),
    ) ?? null
  );
}

export interface Collegamenti {
  /** Personaggi che usano l'invenzione, o che abitano la regione. */
  personaggi: IndexEntry[];
  /** Gadget legati all'invenzione o al personaggio. */
  gadget: IndexEntry[];
  /** Contenuti che hanno questa riga come sorgente. */
  contenuti: IndexEntry[];
}

/** Righe collegate a `id` tramite gli archi del grafo (chi punta a questa riga). */
export function resolveCollegamenti(id: string, graph: Graph, index: IndexEntry[]): Collegamenti {
  const byId = new Map(index.map((e) => [e.id, e]));
  const pick = (kinds: GraphEdge['kind'][], tipo: Tipo): IndexEntry[] =>
    sortByCreatedDesc(
      graph.edges
        .filter((e) => e.to === id && kinds.includes(e.kind))
        .map((e) => byId.get(e.from))
        .filter((e): e is IndexEntry => !!e && e.tipo === tipo),
    );
  return {
    personaggi: pick(['invenzione', 'regione'], 'personaggio'),
    gadget: pick(['invenzione', 'personaggio', 'regione'], 'gadget'),
    contenuti: pick(['sorgente'], 'contenuto'),
  };
}

/** Estrazioni in cui `id` è stato pescato come canone (retrieve → figlia `espansione` obbligatoria). */
export function pescataIn(id: string, estrazioni: Estrazione[]): Estrazione[] {
  return estrazioni.filter((e) => Array.isArray(e.canone_pescato) && e.canone_pescato.includes(id));
}

/** Righe prodotte da un'estrazione: `righe_prodotte` se c'è, più tutte le righe con quel numero. */
export function righeDiEstrazione(e: Estrazione, index: IndexEntry[]): IndexEntry[] {
  const ids = new Set(e.righe_prodotte ?? []);
  return index.filter((r) => r.estrazione === e.estrazione || ids.has(r.id));
}

/** Chiavi uscite di un'estrazione appiattite in coppie leggibili (l'universo ha una colonna sua). */
export function chiaviPiatte(chiavi: Record<string, unknown>): { k: string; v: string }[] {
  const flat = (x: unknown): string =>
    Array.isArray(x)
      ? x.map(flat).join(', ')
      : isRecord(x)
        ? Object.values(x).map(flat).join('/')
        : String(x);
  return Object.entries(chiavi)
    .filter(([k]) => k !== 'universo')
    .map(([k, v]) => ({ k, v: flat(v) }));
}

export function conteggiPerTipo(rows: IndexEntry[]): { tipo: Tipo; n: number }[] {
  const m = new Map<Tipo, number>();
  for (const r of rows) m.set(r.tipo, (m.get(r.tipo) ?? 0) + 1);
  return [...m.entries()].map(([tipo, n]) => ({ tipo, n }));
}
