import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { MediaPage } from './media';

describe('MediaPage', () => {
  it('con media.json vuoto rende lo stato vuoto', async () => {
    await TestBed.configureTestingModule({
      imports: [MediaPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(MediaPage);
    fixture.detectChanges();
    http.expectOne('/data/media.json').flush([]);
    http.expectOne('/data/index.json').flush([]);
    http.expectOne('/data/racconti.json').flush([]);
    await fixture.whenStable();
    fixture.detectChanges();
    http.verify();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toBe('Media');
    expect(el.querySelector('.vuoto')?.textContent).toContain('Nessun media agganciato ancora');
    expect(el.querySelectorAll('.media-tile').length).toBe(0);
    expect(el.querySelector('[aria-live]')?.textContent).toContain('0 di 0 media');
  });
});
