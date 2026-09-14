import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import estrazioni from '../../../../public/data/estrazioni.json';
import index from '../../../../public/data/index.json';
import { EstrazionePage } from './estrazione';

async function monta(n: number): Promise<HTMLElement> {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [EstrazionePage],
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(EstrazionePage);
  fixture.componentRef.setInput('n', String(n));
  fixture.detectChanges();
  http.expectOne('/data/estrazioni.json').flush(estrazioni);
  http.expectOne('/data/index.json').flush(index);
  // Le righe complete (`rows/<id>.json`) partono dopo l'indice: si aspetta un giro di microtask e si rispondono 404.
  for (let giro = 0; giro < 5; giro++) {
    await new Promise((r) => setTimeout(r, 0));
    const pendenti = http.match(() => true);
    if (!pendenti.length) break;
    for (const r of pendenti) r.flush('', { status: 404, statusText: 'Not Found' });
  }
  await fixture.whenStable();
  fixture.detectChanges();
  http.verify();
  return fixture.nativeElement as HTMLElement;
}

describe('EstrazionePage con public/data', () => {
  const conRighe = (estrazioni as { estrazione: number; righe_prodotte?: string[] }[]).filter(
    (e) => (e.righe_prodotte?.length ?? 0) > 0,
  );

  it('nessuna estrazione con righe > 0 rende «Nessuna riga pubblicata»', async () => {
    const vuote: number[] = [];
    for (const e of conRighe) {
      const el = await monta(e.estrazione);
      if (el.textContent?.includes('Nessuna riga pubblicata')) vuote.push(e.estrazione);
    }
    expect(vuote, `estrazioni con righe ma senza righe rese: ${vuote.join(', ')}`).toEqual([]);
  }, 60000);
});
