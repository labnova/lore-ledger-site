// Genera public/data/ dalla fixture in fixture/ (12 righe, 3 universi, 1 regione, 2 figlie).
// Replica in piccolo la logica di engine/compile_site.py del repo privato: index, rows, graph,
// estrazioni, stats, manifest (build: "fixture"), bibbie. Solo per lo sviluppo locale: in
// produzione public/data/ viene sovrascritta dal workflow publish-site-data del repo privato.
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIX = join(ROOT, 'fixture');
const OUT = join(ROOT, 'public', 'data');
const SOMMARIO_MAX = 160;

const rows = JSON.parse(readFileSync(join(FIX, 'rows.json'), 'utf8'));
// Nessun racconto nella fixture: racconti.json vuoto (la pagina /racconti mostra lo stato vuoto).
const raccontiFixture = [];
const estrazioni = JSON.parse(readFileSync(join(FIX, 'estrazioni.json'), 'utf8'));

const dump = (obj, rel) => {
  const p = join(OUT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(obj, sortedKeys, 0) + '\n', 'utf8');
};
// Chiavi ordinate come in compile_site.py (sort_keys=True).
function sortedKeys(_k, v) {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]));
  }
  return v;
}

const titolo = (r) =>
  r.tipo === 'personaggio'
    ? `${r.nome ?? ''} ${r.cognome ?? ''}`.trim()
    : r.tipo === 'contenuto'
      ? String(r.titolo ?? '')
      : String(r.nome ?? '');

const sommario = (r) => {
  let s = r.gancio;
  if (!s) s = { gadget: r.cosa, regione: r.note, contenuto: r.titolo }[r.tipo];
  s = String(s ?? '').split(/\s+/).join(' ');
  return s.length <= SOMMARIO_MAX ? s : s.slice(0, SOMMARIO_MAX - 1).trimEnd() + '…';
};

const index = rows
  .map((r) => {
    const e = {};
    for (const k of ['id', 'tipo', 'universo', 'estrazione', 'created', 'parent_id', 'relazione', 'regione']) {
      e[k] = r[k] ?? null;
    }
    e.titolo = titolo(r);
    e.sommario = sommario(r);
    if ('poc' in r) e.poc = r.poc;
    if ('prod' in r) e.prod = r.prod;
    return e;
  })
  .sort((a, b) => (b.created + b.id).localeCompare(a.created + a.id));

const ids = new Set(rows.map((r) => r.id));
const regioniPerNome = new Map(
  rows.filter((r) => r.tipo === 'regione').map((r) => [`${r.universo}|${String(r.nome).toLowerCase()}`, r.id]),
);
const edges = [];
const add = (a, b, kind) => ids.has(a) && ids.has(b) && edges.push({ from: a, to: b, kind });
for (const r of rows) {
  if (r.parent_id) add(r.parent_id, r.id, 'parent');
  if ((r.tipo === 'personaggio' || r.tipo === 'gadget') && r.invenzione_id) add(r.id, r.invenzione_id, 'invenzione');
  if (r.tipo === 'gadget' && r.personaggio_id) add(r.id, r.personaggio_id, 'personaggio');
  if (r.tipo === 'contenuto' && r.sorgente_id) add(r.id, r.sorgente_id, 'sorgente');
  if (r.regione && r.tipo !== 'regione') {
    const target = ids.has(r.regione) ? r.regione : regioniPerNome.get(`${r.universo}|${String(r.regione).toLowerCase()}`);
    if (target) add(r.id, target, 'regione');
  }
}
const graph = {
  nodes: rows
    .map((r) => ({ id: r.id, tipo: r.tipo, universo: r.universo, titolo: titolo(r) }))
    .sort((a, b) => a.id.localeCompare(b.id)),
  edges,
};

const conta = (key, filtro = () => true) =>
  rows.filter(filtro).reduce((m, r) => ((m[r[key]] = (m[r[key]] ?? 0) + 1), m), {});
const stats = {
  righe_per_tipo: conta('tipo'),
  righe_per_universo: conta('universo'),
  regioni_per_universo: conta('universo', (r) => r.tipo === 'regione'),
  ultima_generazione: rows.map((r) => r.created).sort().at(-1) ?? null,
  estrazioni_totali: estrazioni.length,
  ultimo_build: 'fixture',
};

rmSync(OUT, { recursive: true, force: true });
dump(index, 'index.json');
for (const r of rows) dump(r, join('rows', `${r.id}.json`));
dump(graph, 'graph.json');
dump([...estrazioni].sort((a, b) => a.estrazione - b.estrazione), 'estrazioni.json');
dump(stats, 'stats.json');
dump({ build: 'fixture', commit: 'fixture', schema_version: 1 }, 'manifest.json');
mkdirSync(join(OUT, 'bibbie'), { recursive: true });
for (const f of readdirSync(join(FIX, 'bibbie'))) copyFileSync(join(FIX, 'bibbie', f), join(OUT, 'bibbie', f));

console.log(`fixture → public/data: ${rows.length} righe, ${edges.length} archi, ${estrazioni.length} estrazioni`);
dump(raccontiFixture, 'racconti.json');
