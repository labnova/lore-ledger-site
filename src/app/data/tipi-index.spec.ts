import { describe, expect, it } from 'vitest';
import index from '../../../public/data/index.json';
import { TIPI } from '../models/ledger';

describe('tipi in public/data/index.json', () => {
  it('ogni tipo presente nei dati compilati è dichiarato in TIPI', () => {
    const righe = index as { tipo: string }[];
    const presenti = [...new Set(righe.map((r) => r.tipo))].sort();
    const assenti = presenti.filter((t) => !(TIPI as readonly string[]).includes(t));
    expect(assenti, `tipi nei dati ma assenti da TIPI: ${assenti.join(', ')}`).toEqual([]);
  });
});
