import { describe, expect, it } from 'vitest';
import {
  FILTRO_VUOTO,
  chiaviPiatte,
  filterFeed,
  parseEstrazioni,
  parseGraph,
  parseIndex,
  parseRow,
  pescataIn,
  regioniDistinte,
  resolveCollegamenti,
  resolveLineage,
  resolveRegione,
  righeDiEstrazione,
  totaleRighe,
  parseStats,
} from './ledger-logic';
import { IndexEntry } from '../models/ledger';

const entry = (over: Partial<IndexEntry> & { id: string }): IndexEntry => ({
  tipo: 'invenzione',
  universo: 'neofeudal',
  estrazione: 1,
  created: '2026-09-12',
  parent_id: null,
  relazione: null,
  regione: 'Calvenna',
  titolo: over.id,
  sommario: '',
  ...over,
});

const INDEX: IndexEntry[] = [
  entry({ id: 'NEO-REG-calvenna', tipo: 'regione', regione: null, titolo: 'Calvenna', estrazione: 0 }),
  entry({ id: 'NEO-INV-0001', titolo: 'Giudizio dei Galli', poc: false, created: '2026-09-10' }),
  entry({ id: 'NEO-INV-0002', titolo: 'Rosario delle Quote', poc: true, created: '2026-09-10' }),
  entry({
    id: 'NEO-PER-0001',
    tipo: 'personaggio',
    titolo: 'Juma Mwangaza',
    estrazione: 2,
    created: '2026-09-11',
  }),
  entry({
    id: 'NEO-PER-0002',
    tipo: 'personaggio',
    titolo: 'Amani Kiwele',
    parent_id: 'NEO-PER-0001',
    relazione: 'espansione',
    estrazione: 4,
  }),
  entry({
    id: 'NEO-GAD-0001',
    tipo: 'gadget',
    titolo: 'Sacchetto di Juma',
    prod: true,
    estrazione: 3,
    created: '2026-09-11',
  }),
  entry({
    id: 'CYB-INV-0002',
    universo: 'cyberverse',
    regione: null,
    titolo: 'Liturgia del Ping, corrotta',
    parent_id: 'CYB-INV-0001',
    relazione: 'corruzione',
    estrazione: 6,
  }),
];

describe('parseIndex', () => {
  it('scarta le voci malformate e ordina per created desc, id desc', () => {
    const raw = [
      { id: 'A-INV-0001', tipo: 'invenzione', universo: 'neofeudal', created: '2026-01-01', titolo: 'a' },
      { id: 'B-INV-0001', tipo: 'invenzione', universo: 'neofeudal', created: '2026-02-01', titolo: 'b' },
      { id: 'C-INV-0001', tipo: 'invenzione', universo: 'neofeudal', created: '2026-02-01', titolo: 'c' },
      { id: 'X', tipo: 'boh', universo: 'neofeudal', created: '2026-03-01', titolo: 'x' },
      { id: 'Y', tipo: 'invenzione', universo: 'marte', created: '2026-03-01', titolo: 'y' },
      'stringa',
      null,
    ];
    const out = parseIndex(raw);
    expect(out.map((e) => e.id)).toEqual(['C-INV-0001', 'B-INV-0001', 'A-INV-0001']);
    expect(out[0].parent_id).toBeNull();
    expect(out[0].relazione).toBeNull();
    expect(out[0].sommario).toBe('');
    expect(out[0].estrazione).toBe(0);
  });

  it('ritorna vuoto se il JSON non è un array', () => {
    expect(parseIndex({ nodes: [] })).toEqual([]);
    expect(parseIndex(undefined)).toEqual([]);
  });
});

describe('parseRow', () => {
  it('accetta una riga con id, tipo e universo validi', () => {
    const r = parseRow({
      id: 'NEO-PER-0001',
      tipo: 'personaggio',
      universo: 'neofeudal',
      nome: 'Juma',
      cognome: 'Mwangaza',
      affettivo: null,
    });
    expect(r?.tipo).toBe('personaggio');
    expect(r && r.tipo === 'personaggio' && r.affettivo).toBeNull();
  });

  it('rifiuta righe senza forma minima', () => {
    expect(parseRow(null)).toBeNull();
    expect(parseRow({ id: 'X', tipo: 'drago', universo: 'neofeudal' })).toBeNull();
    expect(parseRow({ id: 'X', tipo: 'gadget', universo: 'nowhere' })).toBeNull();
  });
});

describe('parseGraph / parseEstrazioni / parseStats', () => {
  it('tiene solo gli archi tra nodi esistenti e con kind noto', () => {
    const g = parseGraph({
      nodes: [
        { id: 'A', tipo: 'invenzione', universo: 'neofeudal', titolo: 'A' },
        { id: 'B', tipo: 'personaggio', universo: 'neofeudal', titolo: 'B' },
      ],
      edges: [
        { from: 'B', to: 'A', kind: 'invenzione' },
        { from: 'B', to: 'Z', kind: 'invenzione' },
        { from: 'B', to: 'A', kind: 'amicizia' },
      ],
    });
    expect(g.nodes.length).toBe(2);
    expect(g.edges).toEqual([{ from: 'B', to: 'A', kind: 'invenzione' }]);
  });

  it('ordina le estrazioni per numero decrescente e normalizza i campi', () => {
    const e = parseEstrazioni([
      { estrazione: 1, lotto: 'lotto-lore', chiavi: { universo: 'neofeudal' } },
      { estrazione: 3, forzata: true, campi_forzati: ['universo'] },
      { nope: true },
    ]);
    expect(e.map((x) => x.estrazione)).toEqual([3, 1]);
    expect(e[0].forzata).toBe(true);
    expect(e[1].forzata).toBe(false);
    expect(e[1].campi_forzati).toEqual([]);
    expect(e[0].chiavi).toEqual({});
  });

  it('somma le righe per tipo', () => {
    const s = parseStats({ righe_per_tipo: { invenzione: 21, gadget: 10 }, estrazioni_totali: 4 });
    expect(totaleRighe(s)).toBe(31);
    expect(s.ultima_generazione).toBeNull();
  });
});

describe('filterFeed', () => {
  it('senza filtri restituisce tutto', () => {
    expect(filterFeed(INDEX, FILTRO_VUOTO).length).toBe(INDEX.length);
  });

  it('filtra per tipo, universo e regione', () => {
    expect(filterFeed(INDEX, { ...FILTRO_VUOTO, tipo: 'personaggio' }).map((e) => e.id)).toEqual([
      'NEO-PER-0001',
      'NEO-PER-0002',
    ]);
    expect(filterFeed(INDEX, { ...FILTRO_VUOTO, universo: 'cyberverse' }).map((e) => e.id)).toEqual([
      'CYB-INV-0002',
    ]);
    expect(filterFeed(INDEX, { ...FILTRO_VUOTO, regione: 'calvenna' }).length).toBe(5);
  });

  it('filtra per relazione, incluse le sole radici', () => {
    expect(filterFeed(INDEX, { ...FILTRO_VUOTO, relazione: 'corruzione' }).map((e) => e.id)).toEqual([
      'CYB-INV-0002',
    ]);
    expect(filterFeed(INDEX, { ...FILTRO_VUOTO, relazione: 'nessuna' }).length).toBe(5);
  });

  it('solo poc/prod tiene invenzioni poc e gadget prod', () => {
    expect(filterFeed(INDEX, { ...FILTRO_VUOTO, soloPocProd: true }).map((e) => e.id)).toEqual([
      'NEO-INV-0002',
      'NEO-GAD-0001',
    ]);
  });

  it('cerca nel testo senza accenti e senza maiuscole, anche sull’id', () => {
    expect(filterFeed(INDEX, { ...FILTRO_VUOTO, testo: 'JUMA' }).map((e) => e.id)).toEqual([
      'NEO-PER-0001',
      'NEO-GAD-0001',
    ]);
    expect(filterFeed(INDEX, { ...FILTRO_VUOTO, testo: 'neo-per-0002' }).length).toBe(1);
    expect(filterFeed(INDEX, { ...FILTRO_VUOTO, testo: 'quòte' }).length).toBe(1);
  });

  it('elenca le regioni distinte', () => {
    expect(regioniDistinte(INDEX)).toEqual(['Calvenna']);
  });
});

describe('madre e figlie', () => {
  it('risolve la madre dall’indice e le figlie per parent_id', () => {
    const l = resolveLineage({ id: 'NEO-PER-0001', parent_id: null }, INDEX);
    expect(l.madre).toBeNull();
    expect(l.madreMancante).toBeNull();
    expect(l.figlie.map((f) => f.id)).toEqual(['NEO-PER-0002']);
    expect(l.figlie[0].relazione).toBe('espansione');

    const f = resolveLineage({ id: 'NEO-PER-0002', parent_id: 'NEO-PER-0001' }, INDEX);
    expect(f.madre?.titolo).toBe('Juma Mwangaza');
    expect(f.figlie).toEqual([]);
  });

  it('segnala la madre assente dall’indice', () => {
    const l = resolveLineage({ id: 'CYB-INV-0002', parent_id: 'CYB-INV-0001' }, INDEX);
    expect(l.madre).toBeNull();
    expect(l.madreMancante).toBe('CYB-INV-0001');
  });

  it('risolve la regione sia per nome sia per id, nello stesso universo', () => {
    expect(resolveRegione({ universo: 'neofeudal', regione: 'Calvenna' }, INDEX)?.id).toBe(
      'NEO-REG-calvenna',
    );
    expect(resolveRegione({ universo: 'neofeudal', regione: 'NEO-REG-calvenna' }, INDEX)?.id).toBe(
      'NEO-REG-calvenna',
    );
    expect(resolveRegione({ universo: 'cyberverse', regione: 'Calvenna' }, INDEX)).toBeNull();
    expect(resolveRegione({ universo: 'neofeudal', regione: null }, INDEX)).toBeNull();
  });
});

describe('collegamenti ed estrazioni', () => {
  const graph = parseGraph({
    nodes: INDEX.map((e) => ({ id: e.id, tipo: e.tipo, universo: e.universo, titolo: e.titolo })),
    edges: [
      { from: 'NEO-PER-0001', to: 'NEO-INV-0001', kind: 'invenzione' },
      { from: 'NEO-GAD-0001', to: 'NEO-INV-0002', kind: 'invenzione' },
      { from: 'NEO-GAD-0001', to: 'NEO-PER-0001', kind: 'personaggio' },
      { from: 'NEO-PER-0001', to: 'NEO-REG-calvenna', kind: 'regione' },
      { from: 'NEO-PER-0002', to: 'NEO-REG-calvenna', kind: 'regione' },
      { from: 'NEO-PER-0001', to: 'NEO-PER-0002', kind: 'parent' },
    ],
  });

  it('trova chi usa un’invenzione, i gadget di un personaggio, gli abitanti di una regione', () => {
    expect(resolveCollegamenti('NEO-INV-0001', graph, INDEX).personaggi.map((e) => e.id)).toEqual([
      'NEO-PER-0001',
    ]);
    expect(resolveCollegamenti('NEO-INV-0002', graph, INDEX).gadget.map((e) => e.id)).toEqual([
      'NEO-GAD-0001',
    ]);
    expect(resolveCollegamenti('NEO-PER-0001', graph, INDEX).gadget.map((e) => e.id)).toEqual([
      'NEO-GAD-0001',
    ]);
    expect(
      resolveCollegamenti('NEO-REG-calvenna', graph, INDEX).personaggi.map((e) => e.id),
    ).toEqual(['NEO-PER-0002', 'NEO-PER-0001']);
  });

  it('collega le estrazioni: pescata come canone e righe prodotte', () => {
    const estr = parseEstrazioni([
      { estrazione: 4, lotto: 'lotto-personaggi', canone_pescato: ['NEO-PER-0001'], righe_prodotte: ['NEO-PER-0002'] },
      { estrazione: 1, lotto: 'lotto-lore', chiavi: { universo: 'neofeudal', discipline: [{ macro: 'zoologia', sotto: 'etologia' }] } },
    ]);
    expect(pescataIn('NEO-PER-0001', estr).map((e) => e.estrazione)).toEqual([4]);
    expect(pescataIn('NEO-PER-0002', estr)).toEqual([]);
    expect(righeDiEstrazione(estr[0], INDEX).map((e) => e.id)).toEqual(['NEO-PER-0002']);
    expect(righeDiEstrazione(estr[1], INDEX).map((e) => e.id)).toEqual(['NEO-INV-0001', 'NEO-INV-0002']);
    expect(chiaviPiatte(estr[1].chiavi)).toEqual([{ k: 'discipline', v: 'zoologia/etologia' }]);
  });
});
