import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('crea la shell con la navigazione e mostra il manifest nel footer', async () => {
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    http
      .expectOne('/data/manifest.json')
      .flush({ build: 'fixture', commit: 'abc1234', schema_version: 1 });
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.brand-name')?.textContent).toContain('lore-ledger');
    expect(el.querySelectorAll('.nav-universi a').length).toBe(5);
    expect(el.querySelector('.site-footer .mono')?.textContent).toContain('commit abc1234');
    http.verify();
  });
});
