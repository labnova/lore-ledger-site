import { describe, expect, it } from 'vitest';
import {
  FILTRO_VUOTO,
  TRONCA,
  appareIn,
  filtraRacconti,
  parseRacconti,
  parseRacconto,
  sceneDelTesto,
  chiaviPiatte,
  chiaviRiga,
  raggruppaPerEstrazione,
  raggruppaPerTipo,
  testataEstrazione,
  testoCard,
  tronca,
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

describe('vista per estrazione', () => {
  it('raggruppa per estrazione, dalla più recente, con righe di tipo diverso dentro per tipo', () => {
    const g = raggruppaPerEstrazione(INDEX);
    expect(g.map((x) => x.n)).toEqual([6, 4, 3, 2, 1, 0]);
    const e1 = g.find((x) => x.n === 1)!;
    expect(e1.righe.length).toBe(2);
    expect(e1.perTipo.map((p) => p.tipo)).toEqual(['invenzione']);
    const misto = raggruppaPerEstrazione([
      entry({ id: 'X-REG-a', tipo: 'regione', estrazione: 9, titolo: 'A' }),
      entry({ id: 'X-PER-0001', tipo: 'personaggio', estrazione: 9 }),
      entry({ id: 'X-GAD-0001', tipo: 'gadget', estrazione: 9 }),
      entry({ id: 'X-PER-0002', tipo: 'personaggio', estrazione: 9 }),
      entry({ id: 'X-INV-0001', estrazione: 8 }),
    ]);
    expect(misto.map((x) => x.n)).toEqual([9, 8]);
    expect(misto[0].perTipo.map((p) => [p.tipo, p.righe.length])).toEqual([
      ['personaggio', 2],
      ['gadget', 1],
      ['regione', 1],
    ]);
    expect(raggruppaPerTipo([])).toEqual([]);
  });

  it('costruisce la testata: universo, regione (per id o nome), invenzione madre', () => {
    const e = parseEstrazioni([
      {
        estrazione: 4,
        chiavi: { universo: 'neofeudal', regione: 'NEO-REG-calvenna', invenzione_id: 'NEO-INV-0001', casta: 'clero' },
      },
      { estrazione: 5, chiavi: { universo: 'neofeudal', regione: 'Calvenna' } },
      { estrazione: 6, chiavi: { universo: 'marte', regione: 'Altrove', invenzione_id: 'X' } },
    ]);
    const t4 = testataEstrazione(e[2], INDEX);
    expect(t4.universo).toBe('neofeudal');
    expect(t4.regione?.id).toBe('NEO-REG-calvenna');
    expect(t4.regioneNome).toBe('Calvenna');
    expect(t4.invenzione?.titolo).toBe('Giudizio dei Galli');
    expect(testataEstrazione(e[1], INDEX).regione?.id).toBe('NEO-REG-calvenna');
    const t6 = testataEstrazione(e[0], INDEX);
    expect(t6.universo).toBeNull();
    expect(t6.regione).toBeNull();
    expect(t6.regioneNome).toBe('Altrove');
    expect(t6.invenzione).toBeNull();
  });
});

describe('chiavi in chiaro e testi della card', () => {
  const base = {
    id: 'NEO-INV-0001',
    universo: 'neofeudal',
    estrazione: 1,
    created: '2026-09-12',
    parent_id: null,
    relazione: null,
    epoca_relativa: 0,
    regione: null,
    status: 'canon',
  } as const;

  it('mostra le chiavi solo se i campi ci sono', () => {
    expect(chiaviRiga(parseRow({ ...base, tipo: 'invenzione', discipline: ['idraulica', 'funerario'] })!)).toBe(
      'idraulica × funerario',
    );
    expect(chiaviRiga(parseRow({ ...base, tipo: 'invenzione' })!)).toBeNull();
    expect(
      chiaviRiga(
        parseRow({ ...base, tipo: 'personaggio', casta: 'clero', segno: 'zoppo', tratto: 'mite', difetto: 'avaro' })!,
      ),
    ).toBe('clero · zoppo · mite · avaro');
    expect(chiaviRiga(parseRow({ ...base, tipo: 'personaggio', casta: 'clero', difetto: 'avaro' })!)).toBe(
      'clero · avaro',
    );
    expect(chiaviRiga(parseRow({ ...base, tipo: 'personaggio', casta: '' })!)).toBeNull();
    expect(chiaviRiga(parseRow({ ...base, tipo: 'gadget', chi_lo_porta: 'Juma, alla cintola.' })!)).toBe(
      'Juma, alla cintola.',
    );
    expect(chiaviRiga(parseRow({ ...base, tipo: 'gadget' })!)).toBeNull();
    expect(
      chiaviRiga(parseRow({ ...base, tipo: 'contenuto', medium: 'audio', canale: 'radio_libera', formato: 'podcast_3min' })!),
    ).toBe('audio · radio_libera · podcast_3min');
    expect(chiaviRiga(parseRow({ ...base, tipo: 'contenuto', medium: 'audio' })!)).toBe('audio');
    expect(chiaviRiga(parseRow({ ...base, tipo: 'regione', nome: 'Calvenna' })!)).toBeNull();
  });

  it('non tronca mai il gancio e tronca il secondario a 160', () => {
    const lungo = 'g'.repeat(400);
    const torsione = 't'.repeat(400);
    const t = testoCard(parseRow({ ...base, tipo: 'invenzione', gancio: lungo, torsione })!);
    expect(t.gancio).toBe(lungo);
    expect(t.gancio!.length).toBe(400);
    expect(t.secondario!.length).toBe(TRONCA);
    expect(t.secondario!.endsWith('…')).toBe(true);
    const g = testoCard(parseRow({ ...base, tipo: 'gadget', gancio: lungo, cosa: 'corta' })!);
    expect(g.gancio).toBe(lungo);
    expect(g.secondario).toBe('corta');
    const c = testoCard(parseRow({ ...base, tipo: 'contenuto', titolo: 'x', corpo: 'y' })!);
    expect(c).toEqual({ gancio: null, secondario: null });
    expect(tronca('  breve  ')).toBe('breve');
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

describe('racconti', () => {
  const base = { titolo: 'T', universo: 'steamverse', branch: 'main', cluster: 'STE-INV-0012', regione: 'Ledoskol', testata: null, numero: null,
    personaggi: ['STE-PER-0002'], righe_usate: ['STE-INV-0012', 'STE-PER-0002'], battute: 16000, n_scene: 5, sinossi: 's' };
  const raw = [
    { ...base, id: 'a', slug: '2026-09-10-a', creato: '2026-09-10', stato: 'approvato' },
    { ...base, id: 'b', slug: '2026-09-13-b', creato: '2026-09-13', stato: 'approvato', universo: 'neofeudal', righe_usate: ['NEO-INV-0001'] },
    { ...base, id: 'c', slug: '2026-09-12-c', creato: '2026-09-12', stato: 'bozza' },
    { ...base, id: 'd', slug: '2026-09-11-d', creato: '2026-09-11', stato: 'archiviato' },
    { ...base, id: 'e', slug: '2026-09-11-e', creato: '2026-09-11' },
    { slug: 'rotto' },
  ];

  it('elenco: solo approvati, dal più recente, filtrabile per universo', () => {
    const r = parseRacconti(raw);
    expect(r.map((x) => x.slug)).toEqual(['2026-09-13-b', '2026-09-11-e', '2026-09-10-a']);
    expect(filtraRacconti(r, 'steamverse').map((x) => x.slug)).toEqual(['2026-09-11-e', '2026-09-10-a']);
    expect(filtraRacconti(r, '')).toEqual(r);
    expect(r.some((x) => x.slug.endsWith('-c') || x.slug.endsWith('-d'))).toBe(false);
  });

  it('racconto: mai una bozza, mai la scaletta nei dati letti', () => {
    expect(parseRacconto({ ...raw[2], corpo: 'x' })).toBeNull();
    expect(parseRacconto({ ...raw[0] })).toBeNull();
    const r = parseRacconto({ ...raw[0], corpo: 'Uno.\n\n* * *\n\nDue.', scaletta: 'racconti/scalette/x.yaml', fatti_nuovi: ['f'], fatti_stabiliti: [{ id: 'STE-FAT-x-1', testo: 't', momento: 1, tipo_fatto: 'stato' }, { id: 'no' }] })!;
    expect(r).not.toBeNull();
    expect('scaletta' in r).toBe(false);
    expect(r.fatti_stabiliti.map((f) => f.id)).toEqual(['STE-FAT-x-1']);
    expect(sceneDelTesto(r.corpo)).toEqual(['Uno.', 'Due.']);
    expect(sceneDelTesto('Solo una scena.')).toEqual(['Solo una scena.']);
  });

  it('appare in: dai dati se ci sono, altrimenti da righe_usate', () => {
    const r = parseRacconti(raw);
    expect(appareIn('STE-PER-0002', r).map((x) => x.slug)).toEqual(['2026-09-11-e', '2026-09-10-a']);
    expect(appareIn('NEO-INV-0001', r).map((x) => x.slug)).toEqual(['2026-09-13-b']);
    expect(appareIn('STE-PER-0002', r, ['2026-09-10-a', 'inesistente']).map((x) => x.slug)).toEqual(['2026-09-10-a']);
    expect(appareIn('STE-PER-0002', r, [])).toEqual([]);
    expect(appareIn('XXX', r)).toEqual([]);
  });
});
