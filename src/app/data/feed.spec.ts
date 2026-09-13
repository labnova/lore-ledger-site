import { describe, expect, it } from 'vitest';
import { LIMITE, buildAtom, elementiFeed, isoData } from '../../../scripts/feed-atom.mjs';

const SITE = 'https://esempio.azurestaticapps.net';
const racconti = [
  { slug: '2026-09-13-l-ora-di-anticipo', titolo: "L'Ora di Anticipo", sinossi: 'Chi ha interesse a far tacere <l\'allarme> & perché', universo: 'steamverse', creato: '2026-09-13' },
  { slug: '2026-09-10-vecchio', titolo: 'Vecchio', sinossi: 's', universo: 'neofeudal', creato: '2026-09-10' },
];
const righe = Array.from({ length: 30 }, (_, i) => ({
  id: `NEO-INV-${String(i + 1).padStart(4, '0')}`,
  titolo: `Invenzione ${i + 1}`,
  universo: 'neofeudal',
  created: `2026-09-${String(1 + (i % 12)).padStart(2, '0')}`,
  gancio: i % 2 ? `gancio ${i + 1}` : undefined,
  sommario: `sommario ${i + 1}`,
}));

describe('feed Atom', () => {
  it('tiene al massimo 20 elementi, per data decrescente, racconti prima a parità di data', () => {
    const el = elementiFeed(racconti, righe);
    expect(el.length).toBe(LIMITE);
    for (let i = 1; i < el.length; i++) expect(el[i - 1].data >= el[i].data).toBe(true);
    expect(el[0].kind).toBe('racconto');
    expect(el[0].path).toBe('/racconto/2026-09-13-l-ora-di-anticipo');
    expect(el.every((e) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(e.data))).toBe(true);
    expect(isoData('2026-09-13')).toBe('2026-09-13T00:00:00Z');
    expect(isoData('2026-09-13T14:51:36+00:00')).toBe('2026-09-13T14:51:36Z');
  });

  it('usa la sinossi per i racconti e il gancio (o il sommario) per le righe', () => {
    const el = elementiFeed(racconti, righe, 100);
    const r = el.find((e) => e.id === 'racconto/2026-09-13-l-ora-di-anticipo')!;
    expect(r.sommario).toContain('far tacere');
    expect(el.find((e) => e.id === 'r/NEO-INV-0002')!.sommario).toBe('gancio 2');
    expect(el.find((e) => e.id === 'r/NEO-INV-0001')!.sommario).toBe('sommario 1');
  });

  it('produce XML valido con link assoluti, date ISO e il link self', () => {
    const xml = buildAtom({ site: SITE + '/', racconti, righe, aggiornato: '2026-09-13T15:00:00+00:00' });
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    const entries = [...doc.getElementsByTagName('entry')];
    expect(entries.length).toBe(20);
    expect(doc.getElementsByTagName('updated')[0].textContent).toBe('2026-09-13T15:00:00Z');
    expect(xml).toContain(`<link rel="self" type="application/atom+xml" href="${SITE}/feed.xml"/>`);
    for (const e of entries) {
      expect(e.getElementsByTagName('link')[0].getAttribute('href')!.startsWith(SITE + '/')).toBe(true);
      expect(e.getElementsByTagName('updated')[0].textContent).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      expect(e.getElementsByTagName('title')[0].textContent).toBeTruthy();
    }
    expect(entries[0].getElementsByTagName('summary')[0].textContent).toContain("<l'allarme> & perché");
    expect(xml).not.toContain('scaletta');
  });
});
