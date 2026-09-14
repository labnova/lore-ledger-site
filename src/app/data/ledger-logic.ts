/**
 * Funzioni pure sul contratto dati: nessuna dipendenza da Angular, testabili in isolamento.
 */
import {
  Bacheca,
  EDGE_KINDS,
  Estrazione,
  Graph,
  GraphEdge,
  IndexEntry,
  isTipo,
  isUniverso,
  Manifest,
  Media,
  MEDIA_TIPI,
  MediaRef,
  MediaTipo,
  Racconto,
  RaccontoIndex,
  Relazione,
  Riga,
  Stats,
  Tipo,
  UNIVERSI,
  Universo,
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

const STATI_RACCONTO = new Set(['approvato', 'pubblicato']);

function isRaccontoIndex(v: unknown): v is RaccontoIndex {
  return (
    isRecord(v) &&
    typeof v['slug'] === 'string' &&
    typeof v['titolo'] === 'string' &&
    isUniverso(v['universo']) &&
    typeof v['creato'] === 'string' &&
    (v['stato'] === undefined || STATI_RACCONTO.has(String(v['stato'])))
  );
}

function normalizzaRacconto<T extends RaccontoIndex>(e: T): T {
  return {
    ...e,
    id: e.id ?? e.slug,
    sinossi: typeof e.sinossi === 'string' ? e.sinossi : null,
    branch: e.branch ?? 'main',
    cluster: e.cluster ?? null,
    regione: e.regione ?? null,
    testata: e.testata ?? null,
    numero: typeof e.numero === 'number' ? e.numero : null,
    personaggi: Array.isArray(e.personaggi) ? e.personaggi.map(String) : [],
    righe_usate: Array.isArray(e.righe_usate) ? e.righe_usate.map(String) : [],
    battute: typeof e.battute === 'number' ? e.battute : 0,
    n_scene: typeof e.n_scene === 'number' ? e.n_scene : null,
    media: parseMediaRefs(e.media),
    copertina: typeof e.copertina === 'string' ? e.copertina : null,
  };
}

/** Legge `racconti.json`: solo racconti approvati (una bozza o un archiviato, se mai arrivassero, sono scartati). Ordine: `creato` desc. */
export function parseRacconti(raw: unknown): RaccontoIndex[] {
  if (!Array.isArray(raw)) return [];
  return ordinaRacconti(raw.filter(isRaccontoIndex).map(normalizzaRacconto));
}

export function ordinaRacconti<T extends { creato: string; slug: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.creato !== b.creato) return a.creato < b.creato ? 1 : -1;
    return a.slug < b.slug ? 1 : a.slug > b.slug ? -1 : 0;
  });
}

export function filtraRacconti(rows: RaccontoIndex[], universo: Universo | ''): RaccontoIndex[] {
  return universo ? rows.filter((r) => r.universo === universo) : rows;
}

/** Legge `racconti/<slug>.json`; `null` se non ha la forma minima o non è approvato. La scaletta, se mai presente, viene tolta. */
export function parseRacconto(raw: unknown): Racconto | null {
  if (
    !isRaccontoIndex(raw) ||
    typeof (raw as unknown as Record<string, unknown>)['corpo'] !== 'string'
  )
    return null;
  const { scaletta: _scaletta, ...resto } = raw as unknown as Record<string, unknown>;
  void _scaletta;
  const r = normalizzaRacconto(resto as unknown as Racconto);
  return {
    ...r,
    fatti_nuovi: Array.isArray(r.fatti_nuovi) ? r.fatti_nuovi.map(String) : [],
    fatti_stabiliti: Array.isArray(r.fatti_stabiliti)
      ? r.fatti_stabiliti.filter(
          (f) => isRecord(f) && typeof f['id'] === 'string' && typeof f['testo'] === 'string',
        )
      : [],
  };
}

// ---------------------------------------------------------------------------
// Media

function isMediaTipo(v: unknown): v is MediaTipo {
  return typeof v === 'string' && (MEDIA_TIPI as readonly string[]).includes(v);
}

function isMediaRef(v: unknown): v is MediaRef {
  return (
    isRecord(v) &&
    typeof v['id'] === 'string' &&
    isMediaTipo(v['tipo']) &&
    typeof v['url'] === 'string' &&
    v['url'].length > 0
  );
}

/** Legge `media[]` di una riga o di un racconto; le voci non conformi vengono scartate. */
export function parseMediaRefs(raw: unknown): MediaRef[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isMediaRef).map((m) => ({
    id: m.id,
    tipo: m.tipo,
    url: m.url,
    strumento: typeof m.strumento === 'string' ? m.strumento : '',
  }));
}

/** Legge `media.json`: solo manifest con sorgente e universo validi. Ordine: `creato` desc, poi id desc. */
export function parseMedia(raw: unknown): Media[] {
  if (!Array.isArray(raw)) return [];
  const out: Media[] = [];
  for (const x of raw) {
    if (!isMediaRef(x)) continue;
    const m = x as unknown as Record<string, unknown>;
    if (!isUniverso(m['universo'])) continue;
    const s = m['sorgente'];
    if (
      !isRecord(s) ||
      (s['tipo'] !== 'racconto' && s['tipo'] !== 'riga') ||
      typeof s['ref'] !== 'string'
    )
      continue;
    const p = isRecord(m['parametri']) ? m['parametri'] : {};
    out.push({
      id: x.id,
      tipo: x.tipo,
      url: x.url,
      strumento: typeof m['strumento'] === 'string' ? m['strumento'] : '',
      universo: m['universo'],
      sorgente: { tipo: s['tipo'], ref: s['ref'] },
      creato: typeof m['creato'] === 'string' ? m['creato'] : '',
      ar: typeof p['ar'] === 'string' ? p['ar'] : null,
    });
  }
  return out.sort((a, b) => {
    if (a.creato !== b.creato) return a.creato < b.creato ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

export function primoMedia<T extends MediaRef>(lista: T[], tipo: MediaTipo): T | null {
  return lista.find((m) => m.tipo === tipo) ?? null;
}

export function filtraMedia(lista: Media[], tipo: MediaTipo | ''): Media[] {
  return tipo ? lista.filter((m) => m.tipo === tipo) : lista;
}

export interface GruppoMedia {
  universo: Universo;
  media: Media[];
}

/** Gruppi per universo nell'ordine di `UNIVERSI`; gli universi senza media non compaiono. */
export function raggruppaMediaPerUniverso(lista: Media[]): GruppoMedia[] {
  return UNIVERSI.map((universo) => ({
    universo,
    media: lista.filter((m) => m.universo === universo),
  })).filter((g) => g.media.length > 0);
}

/** Route della sorgente di un media: il racconto o la scheda della riga. */
export function linkSorgente(m: Media): string[] {
  return m.sorgente.tipo === 'racconto' ? ['/racconto', m.sorgente.ref] : ['/r', m.sorgente.ref];
}

/**
 * Testo di una scaletta SVG pronto per l'inline: `null` se il file non è un SVG o contiene script o
 * handler. Il file arriva dal repo privato, ma passa comunque questo controllo prima del bypass del sanitizer.
 */
export function svgInline(testo: string): string | null {
  const t = testo.trim();
  if (!/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(t))
    return null;
  if (/<script|<foreignObject|\son[a-z]+\s*=|javascript:/i.test(t)) return null;
  return t;
}

/** Scene del testo narrativo: segmenti separati da una riga `* * *`. */
export function sceneDelTesto(corpo: string): string[] {
  return corpo
    .split(/^[ \t]*\*[ \t]*\*[ \t]*\*[ \t]*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Racconti che usano la riga: `appare_in` della riga se c'è, altrimenti calcolato da `righe_usate` dei racconti. */
export function appareIn(
  id: string,
  racconti: RaccontoIndex[],
  appare?: string[] | null,
): RaccontoIndex[] {
  const bySlug = new Map(racconti.map((r) => [r.slug, r]));
  if (Array.isArray(appare)) {
    return ordinaRacconti(appare.map((s) => bySlug.get(s)).filter((r): r is RaccontoIndex => !!r));
  }
  return ordinaRacconti(racconti.filter((r) => r.righe_usate.includes(id)));
}

export function parseGraph(raw: unknown): Graph {
  if (!isRecord(raw)) return { nodes: [], edges: [] };
  const nodes = Array.isArray(raw['nodes'])
    ? raw['nodes'].filter(
        (n): n is Graph['nodes'][number] =>
          isRecord(n) &&
          typeof n['id'] === 'string' &&
          isTipo(n['tipo']) &&
          isUniverso(n['universo']),
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
    ultima_generazione:
      typeof r['ultima_generazione'] === 'string' ? r['ultima_generazione'] : null,
    estrazioni_totali: typeof r['estrazioni_totali'] === 'number' ? r['estrazioni_totali'] : 0,
    racconti_totali: typeof r['racconti_totali'] === 'number' ? r['racconti_totali'] : 0,
    ultimo_racconto: typeof r['ultimo_racconto'] === 'string' ? r['ultimo_racconto'] : null,
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
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
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
  return index.filter((r) => (r.estrazione_n ?? r.estrazione) === e.estrazione || ids.has(r.id));
}

/** Id in `righe_prodotte` che non sono (ancora) nell'indice. */
export function righeMancanti(e: Estrazione, index: IndexEntry[]): string[] {
  const noti = new Set(index.map((r) => r.id));
  return (e.righe_prodotte ?? []).filter((id) => !noti.has(id));
}

/** Universi di un'estrazione `cross`: `universi[]` sull'estrazione o nelle chiavi. */
export function universiDiEstrazione(e: Estrazione): string[] {
  const u = Array.isArray(e.universi) ? e.universi : e.chiavi['universi'];
  return Array.isArray(u) ? u.map(String) : [];
}

export function parseBacheca(raw: unknown): Bacheca[] {
  if (!Array.isArray(raw)) return [];
  const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
  return raw
    .filter((b): b is Record<string, unknown> => isRecord(b) && typeof b['id'] === 'string')
    .map((b) => ({
      id: String(b['id']),
      titolo: str(b['titolo']) ?? String(b['id']),
      stato: str(b['stato']) ?? '',
      tipo: str(b['tipo']) ?? '',
      priorita: str(b['priorita']) ?? str(b['priorità']) ?? '',
      universi: arr(b['universi']),
      righe: arr(b['righe']),
      racconto: str(b['racconto']),
      postata_da: str(b['postata_da']),
      presa_da: str(b['presa_da']),
      creata: str(b['creata']),
      presa_il: str(b['presa_il']),
      scade: str(b['scade']),
      chiusa_il: str(b['chiusa_il']),
      tentativi: typeof b['tentativi'] === 'number' ? b['tentativi'] : 0,
      esito: str(b['esito']),
      payload: isRecord(b['payload']) ? b['payload'] : {},
      storia: (Array.isArray(b['storia']) ? b['storia'] : [])
        .filter(isRecord)
        .map((s) => ({
          stato: str(s['stato']) ?? '',
          quando: str(s['quando']) ?? '',
          da: str(s['da']),
        })),
      carta_madre:
        str(b['carta_madre']) ?? (isRecord(b['payload']) ? str(b['payload']['carta_madre']) : null),
    }));
}

const BAC_ID = /^BAC-[0-9a-z]{4,}-[0-9]+$/;
export function isBachecaId(v: string): boolean {
  return BAC_ID.test(v);
}

/** Commenti (`tipo: commento`) della carta `id`, dal più vecchio. */
export function commentiDi(id: string, carte: Bacheca[]): CommentoBacheca[] {
  const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
  return carte
    .filter((c) => c.tipo === 'commento' && c.carta_madre === id)
    .sort((a, b) => (a.creata ?? '').localeCompare(b.creata ?? '') || a.id.localeCompare(b.id))
    .map((c) => ({
      id: c.id,
      da: c.postata_da,
      creata: c.creata,
      posizione: str(c.payload['posizione']) ?? '',
      testo: str(c.payload['testo']) ?? '',
      contro_cercato: arr(c.payload['contro_cercato']),
      contraddizione_id: str(c.payload['contraddizione_id']),
      artefatto_alternativo: str(c.payload['artefatto_alternativo']),
      lacuna: str(c.payload['lacuna']),
    }));
}

export interface CommentoBacheca {
  id: string;
  da: string | null;
  creata: string | null;
  posizione: string;
  testo: string;
  contro_cercato: string[];
  contraddizione_id: string | null;
  artefatto_alternativo: string | null;
  lacuna: string | null;
}

export interface VerdettoApprofondimento {
  esito: string;
  risposta: string | null;
  motivazione_v2: string | null;
  forma_v2: string | null;
  artefatto_v2: string | null;
}

export interface Approfondimento {
  candidati: string[];
  scelto: string | null;
  motivazione: string;
  forma: string | null;
  artefatto: string | null;
  lacuna: string | null;
  /** Presente quando il proponente ha chiuso il dibattito (`payload.esito`). */
  verdetto: VerdettoApprofondimento | null;
}

export function approfondimentoDi(c: Bacheca): Approfondimento {
  const p = c.payload;
  const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
  const esito = str(p['esito']);
  return {
    candidati: Array.isArray(p['candidati']) ? p['candidati'].map(String) : [],
    scelto: str(p['scelto']),
    motivazione: str(p['motivazione']) ?? '',
    forma: str(p['forma']),
    artefatto: str(p['artefatto']),
    lacuna: str(p['lacuna']),
    verdetto: esito
      ? {
          esito,
          risposta: str(p['risposta']),
          motivazione_v2: str(p['motivazione_v2']),
          forma_v2: str(p['forma_v2']),
          artefatto_v2: str(p['artefatto_v2']),
        }
      : null,
  };
}

export interface NotaBacheca {
  osservazione: string;
  bersaglio: string;
  prove: string[];
  modifica_proposta: string;
}

export function notaDi(c: Bacheca): NotaBacheca {
  const p = c.payload;
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  return {
    osservazione: str(p['osservazione']),
    bersaglio: str(p['bersaglio']),
    prove: Array.isArray(p['prove']) ? p['prove'].map(String) : [],
    modifica_proposta: str(p['modifica_proposta']),
  };
}

/** Note (`tipo: nota`) raggruppate per `payload.bersaglio`, bersagli in ordine alfabetico. */
export function notePerBersaglio(carte: Bacheca[]): { bersaglio: string; note: Bacheca[] }[] {
  const m = new Map<string, Bacheca[]>();
  for (const c of carte) {
    if (c.tipo !== 'nota') continue;
    const b = notaDi(c).bersaglio || '(senza bersaglio)';
    m.set(b, [...(m.get(b) ?? []), c]);
  }
  return [...m.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bersaglio, note]) => ({ bersaglio, note }));
}

/**
 * Route interna di un artefatto o di una prova: id di riga → `/r/<id>`, `ledger/<dir>/<id>.yaml` → `/r/<id>`,
 * `racconti/<slug>.md` → `/racconto/<slug>`, `BAC-…` → `/b/<id>`; altrimenti `null` (si mostra come testo).
 */
export function linkArtefatto(s: string): string[] | null {
  const t = s.trim();
  if (/^[A-Z]{3}-[A-Z]{3}-[a-z0-9-]+$/.test(t)) return ['/r', t];
  if (BAC_ID.test(t)) return ['/b', t];
  const riga = /^ledger\/[a-z_]+\/([A-Z]{3}-[A-Z]{3}-[a-z0-9-]+)\.ya?ml$/.exec(t);
  if (riga) return ['/r', riga[1]];
  const racc = /^racconti\/([0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9-]+)\.md$/.exec(t);
  if (racc) return ['/racconto', racc[1]];
  if (/^media\//.test(t)) return ['/media'];
  return null;
}

/** Campi di stato di una carta come coppie etichetta/valore, per i tipi senza vista dedicata. */
export function campiStatoBacheca(c: Bacheca): { k: string; v: string }[] {
  return [
    ['stato', c.stato],
    ['tipo', c.tipo],
    ['priorità', c.priorita],
    ['creata', c.creata],
    ['presa il', c.presa_il],
    ['scade', c.scade],
    ['chiusa il', c.chiusa_il],
    ['tentativi', String(c.tentativi)],
    ['esito', c.esito],
  ]
    .filter((x): x is [string, string] => typeof x[1] === 'string' && x[1] !== '')
    .map(([k, v]) => ({ k, v }));
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

// ---------------------------------------------------------------------------
// Card: chiavi in chiaro, gancio intero, secondario troncato
// ---------------------------------------------------------------------------

export const TRONCA = 160;

export function tronca(s: string, n = TRONCA): string {
  const t = s.trim();
  return t.length <= n ? t : t.slice(0, n - 1).trimEnd() + '…';
}

function campoTesto(r: Riga, k: string): string | null {
  const v = (r as unknown as Record<string, unknown>)[k];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/**
 * Chiavi in chiaro della riga, solo campi presenti nel JSON:
 * invenzione `discipline` (`a × b`), personaggio `casta · segno · tratto · difetto`,
 * gadget `chi_lo_porta`, contenuto `medium · canale · formato`.
 */
export function chiaviRiga(r: Riga): string | null {
  let parti: string[] = [];
  switch (r.tipo) {
    case 'invenzione':
      parti = Array.isArray(r.discipline)
        ? r.discipline.filter((d) => typeof d === 'string' && d)
        : [];
      return parti.length ? parti.join(' × ') : null;
    case 'personaggio':
      parti = ['casta', 'segno', 'tratto', 'difetto']
        .map((k) => campoTesto(r, k))
        .filter((x): x is string => !!x);
      break;
    case 'gadget':
      parti = [campoTesto(r, 'chi_lo_porta')].filter((x): x is string => !!x);
      break;
    case 'contenuto':
      parti = ['medium', 'canale', 'formato']
        .map((k) => campoTesto(r, k))
        .filter((x): x is string => !!x);
      break;
    default:
      return null;
  }
  return parti.length ? parti.join(' · ') : null;
}

export interface TestoCard {
  /** Il gancio, mai troncato. */
  gancio: string | null;
  /** Torsione (invenzione), cosa (gadget) o note (regione), troncato a TRONCA. */
  secondario: string | null;
}

export function testoCard(r: Riga): TestoCard {
  const gancio = campoTesto(r, 'gancio');
  const sec =
    r.tipo === 'invenzione'
      ? campoTesto(r, 'torsione')
      : r.tipo === 'gadget'
        ? campoTesto(r, 'cosa')
        : r.tipo === 'regione'
          ? campoTesto(r, 'note')
          : null;
  return { gancio, secondario: sec ? tronca(sec) : null };
}

// ---------------------------------------------------------------------------
// Vista per estrazione
// ---------------------------------------------------------------------------

export const ORDINE_TIPI: Tipo[] = [
  'invenzione',
  'personaggio',
  'gadget',
  'contenuto',
  'seme',
  'regione',
  'fatto',
];

export interface GruppoTipo {
  tipo: Tipo;
  righe: IndexEntry[];
}

export interface GruppoEstrazione {
  n: number;
  righe: IndexEntry[];
  perTipo: GruppoTipo[];
}

export function raggruppaPerTipo(righe: IndexEntry[]): GruppoTipo[] {
  return ORDINE_TIPI.map((tipo) => ({ tipo, righe: righe.filter((r) => r.tipo === tipo) })).filter(
    (g) => g.righe.length > 0,
  );
}

/** Raggruppa le voci dell'indice per campo `estrazione`, dalla più recente, e dentro per tipo. */
export function raggruppaPerEstrazione(rows: IndexEntry[]): GruppoEstrazione[] {
  const m = new Map<number, IndexEntry[]>();
  for (const r of rows) {
    const a = m.get(r.estrazione) ?? [];
    a.push(r);
    m.set(r.estrazione, a);
  }
  return [...m.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([n, righe]) => ({ n, righe, perTipo: raggruppaPerTipo(righe) }));
}

export interface TestataEstrazione {
  n: number;
  universo: Universo | null;
  /** Lista `universi[]` quando l'estrazione è `cross`. */
  universi: string[];
  /** Regione risolta nell'indice (per id o nome), se c'è. */
  regione: IndexEntry | null;
  /** Nome da mostrare: titolo della regione risolta, altrimenti la chiave grezza. */
  regioneNome: string | null;
  /** Invenzione madre del lotto (`chiavi.invenzione_id`), se nell'indice. */
  invenzione: IndexEntry | null;
}

export function testataEstrazione(e: Estrazione, index: IndexEntry[]): TestataEstrazione {
  const u = e.chiavi['universo'];
  const universo = isUniverso(u) ? u : null;
  const reg =
    typeof e.chiavi['regione'] === 'string' && e.chiavi['regione'] ? e.chiavi['regione'] : null;
  const regione = universo && reg ? resolveRegione({ universo, regione: reg }, index) : null;
  const invId = e.chiavi['invenzione_id'];
  const invenzione = typeof invId === 'string' ? (index.find((x) => x.id === invId) ?? null) : null;
  const universi = u === 'cross' ? universiDiEstrazione(e) : [];
  return {
    n: e.estrazione,
    universo,
    universi,
    regione,
    regioneNome: regione?.titolo ?? reg,
    invenzione,
  };
}

export function conteggiPerTipo(rows: IndexEntry[]): { tipo: Tipo; n: number }[] {
  const m = new Map<Tipo, number>();
  for (const r of rows) m.set(r.tipo, (m.get(r.tipo) ?? 0) + 1);
  return [...m.entries()].map(([tipo, n]) => ({ tipo, n }));
}
