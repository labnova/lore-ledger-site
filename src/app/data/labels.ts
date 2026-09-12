import { Relazione, Tipo, Universo } from '../models/ledger';

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
  regione: 'regione',
};

export const TIPO_PLURALE: Record<Tipo, string> = {
  invenzione: 'invenzioni',
  personaggio: 'personaggi',
  gadget: 'gadget',
  contenuto: 'contenuti',
  regione: 'regioni',
};

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
  contenuto: ['titolo', 'sorgente_id', 'madre_id', 'medium', 'canale', 'formato', 'veridicita', 'corpo'],
  regione: ['nome', 'onomastica', 'ceppo_dominante', 'p_cognome_mestiere', 'note'],
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
