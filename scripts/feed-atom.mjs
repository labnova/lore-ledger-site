// Builder del feed Atom statico (/feed.xml): funzione pura, usata da scripts/feed.mjs e dai test.
// Elementi: racconti approvati (link /racconto/<slug>, sommario = sinossi) e righe nuove del ledger
// (link /r/<id>, sommario = gancio, altrimenti sommario dell'indice). Ultimi 20, per data decrescente.

export const LIMITE = 20;

export function escapeXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Data ISO 8601 completa (Atom la richiede): `2026-09-13` → `2026-09-13T00:00:00Z`. */
export function isoData(d) {
  const s = String(d ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00Z`;
  const t = Date.parse(s);
  return Number.isNaN(t) ? new Date(0).toISOString().replace(/\.\d{3}Z$/, 'Z') : new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Normalizza racconti e righe in elementi omogenei, ordinati per data desc (racconti prima a parità). */
export function elementiFeed(racconti, righe, limite = LIMITE) {
  const r = (racconti ?? []).map((x) => ({
    kind: 'racconto',
    id: `racconto/${x.slug ?? x.id}`,
    path: `/racconto/${x.slug ?? x.id}`,
    titolo: x.titolo ?? x.slug ?? x.id,
    data: isoData(x.creato),
    sommario: x.sinossi ?? '',
    universo: x.universo ?? '',
  }));
  const l = (righe ?? []).map((x) => ({
    kind: 'riga',
    id: `r/${x.id}`,
    path: `/r/${x.id}`,
    titolo: x.titolo ? `${x.titolo} (${x.id})` : x.id,
    data: isoData(x.created),
    sommario: x.gancio ?? x.sommario ?? '',
    universo: x.universo ?? '',
  }));
  return [...r, ...l]
    .sort((a, b) => (a.data === b.data ? (a.kind === b.kind ? (a.id < b.id ? 1 : -1) : a.kind === 'racconto' ? -1 : 1) : a.data < b.data ? 1 : -1))
    .slice(0, limite);
}

/** Documento Atom completo. `site` senza slash finale, es. https://esempio.azurestaticapps.net */
export function buildAtom({ site, racconti, righe, limite = LIMITE, aggiornato }) {
  const base = String(site).replace(/\/+$/, '');
  const items = elementiFeed(racconti, righe, limite);
  const updated = aggiornato ? isoData(aggiornato) : (items[0]?.data ?? isoData(new Date().toISOString()));
  const entries = items
    .map(
      (e) => `  <entry>
    <title>${escapeXml(e.titolo)}</title>
    <link rel="alternate" type="text/html" href="${escapeXml(base + e.path)}"/>
    <id>${escapeXml(base + '/' + e.id)}</id>
    <updated>${e.data}</updated>
    <category term="${escapeXml(e.kind)}"/>${e.universo ? `\n    <category term="${escapeXml(e.universo)}"/>` : ''}
    <summary type="text">${escapeXml(e.sommario)}</summary>
  </entry>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>lore-ledger</title>
  <subtitle>racconti approvati e righe nuove del ledger</subtitle>
  <link rel="self" type="application/atom+xml" href="${escapeXml(base)}/feed.xml"/>
  <link rel="alternate" type="text/html" href="${escapeXml(base)}/"/>
  <id>${escapeXml(base)}/</id>
  <updated>${updated}</updated>
  <author><name>lore-ledger</name></author>
${entries}
</feed>
`;
}
