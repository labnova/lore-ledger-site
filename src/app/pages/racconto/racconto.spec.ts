import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { RaccontoPage } from './racconto';

const SLUG = '2026-09-13-l-ora-di-anticipo';
const COPERTINA = 'https://blob/steamverse/copertina/MED-a1b2-1.png';
const SUONO = 'https://blob/steamverse/suono/MED-a1b2-2.mp3';

const base = {
  id: 'RAC-1',
  slug: SLUG,
  titolo: "L'Ora di Anticipo",
  sinossi: "Chi ha interesse a far tacere l'allarme",
  universo: 'steamverse',
  branch: 'main',
  cluster: 'STE-INV-0012',
  regione: 'Ledoskol',
  testata: null,
  numero: null,
  personaggi: [],
  righe_usate: ['STE-INV-0012'],
  battute: 1200,
  creato: '2026-09-13',
  n_scene: 2,
  corpo: 'Prima scena.\n\n* * *\n\nSeconda scena.',
  fatti_nuovi: [],
  fatti_stabiliti: [
    { id: 'STE-FAT-m20260913-1', testo: 'La Chiusa Terza è la più bassa.', momento: 1, tipo_fatto: 'stato' },
  ],
};

async function monta(racconto: Record<string, unknown>, svg: string | null): Promise<HTMLElement> {
  await TestBed.configureTestingModule({
    imports: [RaccontoPage],
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(RaccontoPage);
  fixture.componentRef.setInput('slug', SLUG);
  fixture.detectChanges();
  http.expectOne(`/data/racconti/${SLUG}.json`).flush(racconto);
  http.expectOne('/data/index.json').flush([]);
  const s = http.expectOne(`/data/scalette/${SLUG}.scaletta.svg`);
  if (svg === null) s.flush('', { status: 404, statusText: 'Not Found' });
  else s.flush(svg);
  await fixture.whenStable();
  fixture.detectChanges();
  http.verify();
  return fixture.nativeElement as HTMLElement;
}

describe('RaccontoPage', () => {
  it('senza media rende il racconto come prima: nessuna copertina, scaletta o player', async () => {
    const el = await monta(base, null);
    expect(el.querySelector('h1')?.textContent).toBe("L'Ora di Anticipo");
    expect(el.querySelectorAll('.lettura > div').length).toBe(2);
    expect(el.querySelector('.lettura .separatore')).not.toBeNull();
    expect(el.querySelectorAll('.racconto-coda .fatti li').length).toBe(1);
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('details')).toBeNull();
    expect(el.querySelector('audio')).toBeNull();
  });

  it('con media rende copertina, scaletta a scomparsa chiusa e player audio dopo i fatti', async () => {
    const el = await monta(
      {
        ...base,
        copertina: COPERTINA,
        media: [
          { id: 'MED-a1b2-1', tipo: 'copertina', url: COPERTINA, strumento: 'chatgpt_images' },
          { id: 'MED-a1b2-2', tipo: 'suono', url: SUONO, strumento: 'suno' },
        ],
      },
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect width="100" height="50"/></svg>',
    );
    const img = el.querySelector('img.copertina');
    expect(img?.getAttribute('src')).toBe(COPERTINA);
    expect(img?.getAttribute('alt')).toBe("copertina · L'Ora di Anticipo");
    expect(img?.getAttribute('loading')).toBe('lazy');
    expect(img?.getAttribute('width')).toBe('400');
    expect(img?.getAttribute('height')).toBe('600');
    const det = el.querySelector<HTMLDetailsElement>('details.scaletta');
    expect(det).not.toBeNull();
    expect(det?.open).toBe(false);
    expect(det?.querySelector('svg rect')).not.toBeNull();
    const audio = el.querySelector('.racconto-coda audio.suono');
    expect(audio?.getAttribute('src')).toBe(SUONO);
    expect(audio?.hasAttribute('controls')).toBe(true);
    const coda = el.querySelector('.racconto-coda')!.innerHTML;
    expect(coda.indexOf('class="fatti"')).toBeLessThan(coda.indexOf('<audio'));
  });
});
