import { MediaTipo, Relazione, Tipo, Universo } from '../models/ledger';

export const UNIVERSO_LABEL: Record<Universo, string> = {
  cyberverse: 'Cyberverse',
  neofeudal: 'Neofeudal',
  steamverse: 'Steamverse',
  hackverse: 'Hackverse',
  elabverse: 'Elabverse',
};

export const TIPO_LABEL: Record<Tipo, string> = {
  invenzione: 'invenzione',
  personaggio: 'personaggio',
  gadget: 'gadget',
  contenuto: 'contenuto',
  seme: 'seme',
  regione: 'regione',
  fatto: 'fatto',
};

export const TIPO_PLURALE: Record<Tipo, string> = {
  invenzione: 'invenzioni',
  personaggio: 'personaggi',
  gadget: 'gadget',
  contenuto: 'contenuti',
  seme: 'semi',
  regione: 'regioni',
  fatto: 'fatti',
};

export const MEDIA_LABEL: Record<MediaTipo, string> = {
  copertina: 'copertina',
  ritratto: 'ritratto',
  tavola: 'tavola',
  scena: 'scena',
  suono: 'suono',
};

export const MEDIA_PLURALE: Record<MediaTipo, string> = {
  copertina: 'copertine',
  ritratto: 'ritratti',
  tavola: 'tavole',
  scena: 'scene',
  suono: 'suoni',
};

/** Nome di mestiere degli agenti della bacheca (da `agenti.yaml` del repo privato); il curatore umano è «curatore». */
export const AGENTE_LABEL: Record<string, string> = {
  illustratore: 'art director',
  riparatore: 'restauratore del ledger',
  guardiano: 'responsabile della pipeline',
  redattore: 'redattore di prosa',
  editore: 'direttore editoriale',
  enzo: 'curatore',
};

/** Etichetta leggibile di un agente: il mestiere se noto, altrimenti il nome tecnico. */
export function nomeAgente(nome: string | null | undefined): string {
  if (!nome) return '—';
  return AGENTE_LABEL[nome] ?? nome;
}

export const STRUMENTO_LABEL: Record<string, string> = {
  midjourney: 'Midjourney',
  chatgpt_images: 'ChatGPT Images',
  suno: 'Suno',
};

/**
 * Larghezza/altezza intrinseche per `width`/`height` degli `<img>` (evitano il layout shift):
 * dai rapporti `ar_*` di `stili/<universo>.md` (copertina 2:3, ritratto 3:4, tavola 4:3);
 * la scena non ha un `ar_` dichiarato e si assume 16:9. Il suono non ha immagine.
 */
export const AR_MEDIA: Record<MediaTipo, [number, number]> = {
  copertina: [400, 600],
  ritratto: [360, 480],
  tavola: [480, 360],
  scena: [480, 270],
  suono: [0, 0],
};

/** Dimensioni da un `ar` esplicito (`"2:3"`), altrimenti quelle note per il tipo. */
export function dimensioniMedia(tipo: MediaTipo, ar: string | null | undefined): [number, number] {
  const m = ar && /^([0-9]+):([0-9]+)$/.exec(ar);
  if (m) {
    const w = Number(m[1]);
    const h = Number(m[2]);
    if (w > 0 && h > 0)
      return w >= h ? [480, Math.round((480 * h) / w)] : [Math.round((480 * w) / h), 480];
  }
  return AR_MEDIA[tipo];
}

export const RELAZIONE_LABEL: Record<Relazione, string> = {
  dialetto: 'dialetto',
  evoluzione: 'evoluzione',
  vecchia_timeline: 'vecchia timeline',
  corruzione: 'corruzione',
  espansione: 'espansione',
  adattamento: 'adattamento',
  materializzazione: 'materializzazione',
};

/** Etichette in italiano dei campi mostrati nella scheda riga. */
export const CAMPO_LABEL: Record<string, string> = {
  id: 'id',
  tipo: 'tipo',
  universo: 'universo',
  estrazione: 'estrazione',
  created: 'creata il',
  parent_id: 'madre',
  relazione: 'relazione',
  epoca_relativa: 'epoca relativa',
  regione: 'regione',
  status: 'stato',
  schema_version: 'versione schema',
  nome_reale: 'nome reale',
  nome: 'nome',
  cognome: 'cognome',
  discipline: 'discipline',
  torsione: 'torsione',
  gancio: 'gancio',
  poc: 'proof of concept',
  ceppo: 'ceppo onomastico',
  casta: 'casta',
  invenzione_id: 'invenzione',
  rapporto: 'rapporto con l’invenzione',
  eta_fascia: 'fascia d’età',
  segno: 'segno',
  tratto: 'tratto',
  difetto: 'difetto',
  affettivo: 'asse affettivo',
  spirituale: 'asse spirituale',
  contraddizione: 'contraddizione',
  cosa: 'che cos’è',
  chi_lo_porta: 'chi lo porta',
  personaggio_id: 'personaggio',
  tradimento_tech: 'tradimento tecnologico',
  prod: 'in produzione',
  sorgente_id: 'sorgente',
  medium: 'medium',
  canale: 'canale',
  formato: 'formato',
  veridicita: 'veridicità',
  titolo: 'titolo',
  corpo: 'corpo',
  madre_id: 'contenuto madre',
  onomastica: 'onomastica',
  ceppo_dominante: 'ceppo dominante',
  p_cognome_mestiere: 'probabilità cognome da mestiere',
  note: 'note',
};

/** Ordine di presentazione dei campi specifici per tipo (i comuni vanno in coda). */
export const CAMPI_TIPO: Record<Tipo, string[]> = {
  invenzione: ['nome', 'nome_reale', 'discipline', 'torsione', 'gancio', 'poc'],
  personaggio: [
    'nome',
    'cognome',
    'casta',
    'ceppo',
    'eta_fascia',
    'invenzione_id',
    'rapporto',
    'segno',
    'contraddizione',
    'gancio',
  ],
  gadget: [
    'nome',
    'cosa',
    'chi_lo_porta',
    'invenzione_id',
    'personaggio_id',
    'tradimento_tech',
    'gancio',
    'prod',
  ],
  contenuto: [
    'titolo',
    'sorgente_id',
    'madre_id',
    'medium',
    'canale',
    'formato',
    'veridicita',
    'corpo',
  ],
  seme: ['cluster', 'premessa', 'ostacolo', 'rottura', 'tono', 'origine'],
  regione: ['nome', 'onomastica', 'ceppo_dominante', 'p_cognome_mestiere', 'note'],
  fatto: [
    'branch',
    'testo',
    'soggetti',
    'stabilito_da',
    'cluster',
    'momento',
    'tipo_fatto',
    'reversibile',
  ],
};

export const CAMPI_COMUNI = [
  'id',
  'tipo',
  'universo',
  'regione',
  'estrazione',
  'created',
  'epoca_relativa',
  'parent_id',
  'relazione',
  'status',
  'schema_version',
];

/** I quattro assi del personaggio: uno di questi fa attrito con la casta (`contraddizione`). */
export const ASSI_PERSONAGGIO = ['tratto', 'difetto', 'affettivo', 'spirituale'] as const;

/** Campi che si rendono in mono: id, riferimenti, valori tecnici. */
export const CAMPI_MONO = new Set([
  'id',
  'parent_id',
  'invenzione_id',
  'personaggio_id',
  'sorgente_id',
  'madre_id',
  'estrazione',
  'created',
  'epoca_relativa',
  'schema_version',
  'status',
  'p_cognome_mestiere',
  'discipline',
  'medium',
  'formato',
  'veridicita',
  'canale',
  'onomastica',
  'ceppo',
  'ceppo_dominante',
  'casta',
  'rapporto',
  'eta_fascia',
]);

/** Campi che portano a un'altra riga. */
export const CAMPI_LINK = new Set([
  'parent_id',
  'invenzione_id',
  'personaggio_id',
  'sorgente_id',
  'madre_id',
]);

export function snake(v: string): string {
  return v.replace(/_/g, ' ');
}
