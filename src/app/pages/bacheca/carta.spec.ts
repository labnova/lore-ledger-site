import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { CartaBachecaPage } from './carta';

const base = {
  stato: 'aperta',
  universi: ['steamverse'],
  righe: ['STE-INV-0010'],
  racconto: null,
  priorita: 3,
  presa_da: null,
  presa_il: null,
  scade: null,
  chiusa_il: null,
  tentativi: 0,
  esito: null,
};

const APPROFONDIMENTO = {
  ...base,
  id: 'BAC-1111-1',
  tipo: 'approfondimento',
  postata_da: 'riparatore',
  creata: '2026-09-14T21:50:04Z',
  payload: {
    candidati: ['STE-INV-0010', 'STE-INV-0021', 'HAC-PER-0011'],
    scelto: 'STE-INV-0010',
    motivazione: 'Due vuoti e una orfanità che posso riparare.',
    forma: 'espansione',
    artefatto: 'ledger/invenzioni/STE-INV-0027.yaml',
    lacuna: 'nessuna figlia',
  },
  storia: [{ stato: 'aperta', quando: '2026-09-14T21:50:04Z', da: 'riparatore' }],
};

const commento = (n: number, da: string, creata: string) => ({
  ...base,
  id: `BAC-2222-${n}`,
  tipo: 'commento',
  postata_da: da,
  creata,
  carta_madre: 'BAC-1111-1',
  payload: {
    carta_madre: 'BAC-1111-1',
    posizione: 'obietto',
    testo: `Obiezione numero ${n}.`,
    contro_cercato: ['STE-INV-0027'],
    contraddizione_id: 'STE-INV-0027',
    artefatto_alternativo: null,
    lacuna: null,
  },
  storia: [{ stato: 'aperta', quando: creata, da }],
});

const NOTA = {
  ...base,
  id: 'BAC-3333-1',
  tipo: 'nota',
  stato: 'attesa_curatore',
  postata_da: 'guardiano',
  creata: '2026-09-14T22:00:00Z',
  payload: {
    osservazione: 'Il pool dei ceppi ripete lo slavo.',
    bersaglio: 'pool:ceppi',
    prove: ['STE-PER-0003', 'STE-PER-0009'],
    modifica_proposta: 'Pesare i ceppi per regione.',
  },
  storia: [{ stato: 'attesa_curatore', quando: '2026-09-14T22:00:00Z', da: 'guardiano' }],
};

const BACHECA = [
  APPROFONDIMENTO,
  commento(1, 'redattore', '2026-09-14T21:51:02Z'),
  commento(2, 'editore', '2026-09-14T21:51:07Z'),
  NOTA,
];

async function monta(id: string, stato = 200): Promise<HTMLElement> {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [CartaBachecaPage],
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(CartaBachecaPage);
  fixture.componentRef.setInput('id', id);
  fixture.detectChanges();
  const req = http.expectOne('/data/bacheca.json');
  if (stato === 200) req.flush(BACHECA);
  else req.flush('', { status: stato, statusText: 'Server Error' });
  await fixture.whenStable();
  fixture.detectChanges();
  http.verify();
  return fixture.nativeElement as HTMLElement;
}

describe('CartaBachecaPage', () => {
  it('approfondimento con due commenti: candidati con link, scelto, motivazione, commenti annidati', async () => {
    const el = await monta('BAC-1111-1');
    const cand = [...el.querySelectorAll('.candidati li a')].map((a) => a.getAttribute('href'));
    expect(cand).toEqual(['/r/STE-INV-0010', '/r/STE-INV-0021', '/r/HAC-PER-0011']);
    expect(el.querySelector('.candidati li:first-child .scelto')?.textContent).toBe('scelto');
    expect(el.querySelectorAll('.candidati .scelto').length).toBe(1);
    expect(el.querySelector('.motivazione')?.textContent).toContain('Due vuoti');
    expect(el.querySelector('a.artefatto')?.getAttribute('href')).toBe('/r/STE-INV-0027');
    const commenti = el.querySelectorAll('.commenti > li.commento');
    expect(commenti.length).toBe(2);
    expect(commenti[0].querySelector('.testo')?.textContent).toContain('Obiezione numero 1');
    expect(commenti[1].querySelector('.testo')?.textContent).toContain('Obiezione numero 2');
    expect(commenti[0].querySelector('.contro a')?.getAttribute('href')).toBe('/r/STE-INV-0027');
    expect(commenti[0].querySelector('.posizione')?.textContent).toBe('obietto');
    expect(commenti[0].textContent).toContain('redattore di prosa');
    expect(commenti[1].textContent).toContain('direttore editoriale');
    expect(el.textContent).toContain('restauratore del ledger');
    expect(el.querySelector('#verdetto')).toBeNull();
    expect(el.querySelectorAll('.storia li').length).toBe(1);
    const html = el.innerHTML;
    expect(html.indexOf('id="candidati"')).toBeLessThan(html.indexOf('id="motivazione"'));
    expect(html.indexOf('id="motivazione"')).toBeLessThan(html.indexOf('id="commenti"'));
    expect(html.indexOf('id="commenti"')).toBeLessThan(html.indexOf('id="storia"'));
  });

  it('nota: osservazione, bersaglio, prove come link, modifica proposta', async () => {
    const el = await monta('BAC-3333-1');
    expect(el.querySelector('.osservazione')?.textContent).toContain('ripete lo slavo');
    expect(el.querySelector('.bersaglio')?.textContent).toBe('pool:ceppi');
    const prove = [...el.querySelectorAll('a.prova')].map((a) => a.getAttribute('href'));
    expect(prove).toEqual(['/r/STE-PER-0003', '/r/STE-PER-0009']);
    expect(el.querySelector('.modifica')?.textContent).toContain('Pesare i ceppi');
    expect(el.textContent).toContain('responsabile della pipeline');
  });

  it('id assente dal json: «Carta non ancora pubblicata» con link alla bacheca, senza errore', async () => {
    const el = await monta('BAC-9999-9');
    expect(el.querySelector('h1')?.textContent).toBe('Carta non ancora pubblicata');
    expect(el.querySelector('.non-pubblicata')?.textContent).toContain(
      'il json del sito si aggiorna a ogni run di publish-site-data',
    );
    expect(el.querySelector('a[href="/b"]')).not.toBeNull();
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('fetch fallito: messaggio di errore distinto, con link alla bacheca', async () => {
    const el = await monta('BAC-1111-1', 500);
    expect(el.querySelector('h1')?.textContent).toBe('Bacheca non raggiungibile');
    expect(el.querySelector('[role="alert"].errore-fetch')).not.toBeNull();
    expect(el.textContent).not.toContain('Carta non ancora pubblicata');
    expect(el.querySelector('a[href="/b"]')).not.toBeNull();
  });
});
