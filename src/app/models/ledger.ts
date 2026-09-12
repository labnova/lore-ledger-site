/**
 * Tipi del contratto dati prodotto da `engine/compile_site.py` del repo privato lore-ledger.
 * Le rows sono copiate senza trasformazioni dallo YAML del ledger; gli altri file sono derivati.
 */

export const UNIVERSI = ['cyberverse', 'neofeudal', 'steamverse', 'hackverse', 'elabverse'] as const;
export type Universo = (typeof UNIVERSI)[number];

export const TIPI = ['invenzione', 'personaggio', 'gadget', 'contenuto', 'regione'] as const;
export type Tipo = (typeof TIPI)[number];

export const RELAZIONI = [
  'dialetto',
  'evoluzione',
  'vecchia_timeline',
  'corruzione',
  'espansione',
  'adattamento',
  'materializzazione',
] as const;
export type Relazione = (typeof RELAZIONI)[number];

export const ETA_FASCE = ['bambino', 'adolescente', 'giovane', 'adulto', 'maturo', 'anziano'] as const;
export type EtaFascia = (typeof ETA_FASCE)[number];

export type Rapporto = 'usa' | 'teme' | 'falsifica' | 'costruita' | 'vende' | 'studia';
export type Onomastica = 'legata' | 'totale';
export type Ceppo =
  | 'germanico'
  | 'turco'
  | 'giapponese'
  | 'slavo'
  | 'arabo'
  | 'magiaro'
  | 'basco'
  | 'scandinavo'
  | 'swahili'
  | 'ibrido';
export type Medium =
  | 'testo_lungo'
  | 'testo_breve'
  | 'immagini'
  | 'audio'
  | 'video_corto'
  | 'video_lungo'
  | 'community'
  | 'fisico';
export type Formato =
  | 'making_of'
  | 'snippet_300'
  | 'documento_ritrovato'
  | 'paper_in_universe'
  | 'thread_5'
  | 'trailer_20s'
  | 'podcast_3min'
  | 'pezzo_ilpost'
  | 'locandina';
export type Veridicita = 'in_universe' | 'making_of';

/** Campi comuni a ogni riga del ledger. */
export interface RigaBase {
  id: string;
  tipo: Tipo;
  universo: Universo;
  estrazione: number;
  created: string;
  parent_id: string | null;
  relazione: Relazione | null;
  epoca_relativa: number;
  /** Nome o id della regione: le righe usano il nome, i log delle estrazioni l'id. */
  regione: string | null;
  status: 'canon';
  schema_version?: number;
}

export interface Invenzione extends RigaBase {
  tipo: 'invenzione';
  nome_reale: string;
  nome: string;
  discipline: [string, string];
  torsione: string;
  gancio: string;
  poc: boolean;
}

export interface Affettivo {
  orientamento: string;
  situazione: string;
}

export interface Spirituale {
  rapporto: string;
  credenza: string;
}

export interface Personaggio extends RigaBase {
  tipo: 'personaggio';
  nome: string;
  cognome: string;
  ceppo: Ceppo;
  casta: string;
  invenzione_id: string;
  rapporto: Rapporto;
  eta_fascia: EtaFascia;
  segno: string;
  tratto: string;
  difetto: string;
  affettivo: Affettivo | null;
  spirituale: Spirituale;
  contraddizione: string;
  gancio: string;
}

export interface Gadget extends RigaBase {
  tipo: 'gadget';
  nome: string;
  cosa: string;
  chi_lo_porta: string;
  invenzione_id: string;
  personaggio_id: string;
  tradimento_tech: string;
  gancio: string;
  prod: boolean;
}

export interface Contenuto extends RigaBase {
  tipo: 'contenuto';
  sorgente_id: string;
  medium: Medium;
  canale: string;
  formato: Formato;
  veridicita: Veridicita;
  titolo: string;
  corpo: string;
  madre_id: string | null;
}

export interface Regione extends RigaBase {
  tipo: 'regione';
  nome: string;
  onomastica: Onomastica;
  ceppo_dominante: Ceppo | null;
  p_cognome_mestiere: number;
  note: string;
}

export type Riga = Invenzione | Personaggio | Gadget | Contenuto | Regione;

/** Voce di `index.json`: riga leggera, ordinata per `created` desc. */
export interface IndexEntry {
  id: string;
  tipo: Tipo;
  universo: Universo;
  estrazione: number;
  created: string;
  parent_id: string | null;
  relazione: Relazione | null;
  regione: string | null;
  titolo: string;
  sommario: string;
  poc?: boolean;
  prod?: boolean;
}

export type EdgeKind = 'parent' | 'invenzione' | 'personaggio' | 'sorgente' | 'regione';
export const EDGE_KINDS: EdgeKind[] = ['parent', 'invenzione', 'personaggio', 'sorgente', 'regione'];

export interface GraphNode {
  id: string;
  tipo: Tipo;
  universo: Universo;
  titolo: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: EdgeKind;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type Lotto = 'lotto-lore' | 'lotto-personaggi' | 'lotto-gadget' | 'lotto-contenuti';

/** Log di un'estrazione CSPRNG. Le chiavi variano per lotto: `chiavi` è tenuto generico. */
export interface Estrazione {
  estrazione: number;
  lotto: Lotto | string;
  created: string;
  esito: string;
  forzata: boolean;
  campi_forzati: string[];
  chiavi: Record<string, unknown>;
  righe_prodotte?: string[];
  righe_attese?: [string, string];
  canone_pescato?: string[];
  espansioni?: { id: string; parent_id: string }[];
  poc?: number[];
  prod?: number[];
  note?: string;
  [extra: string]: unknown;
}

export interface Stats {
  righe_per_tipo: Partial<Record<Tipo, number>>;
  righe_per_universo: Partial<Record<Universo, number>>;
  regioni_per_universo: Partial<Record<Universo, number>>;
  ultima_generazione: string | null;
  estrazioni_totali: number;
  ultimo_build: string;
}

export interface Manifest {
  /** ISO datetime del build, oppure `"fixture"` per i dati di sviluppo locale. */
  build: string;
  commit: string;
  schema_version: number;
}

export function isUniverso(v: unknown): v is Universo {
  return typeof v === 'string' && (UNIVERSI as readonly string[]).includes(v);
}

export function isTipo(v: unknown): v is Tipo {
  return typeof v === 'string' && (TIPI as readonly string[]).includes(v);
}
