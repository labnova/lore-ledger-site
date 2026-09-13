// Scrive public/feed.xml (Atom, ultimi 20 fra racconti approvati e righe nuove) da public/data/.
// Gira come `prebuild` (npm run build) e a mano con `npm run feed`. public/data/ non si tocca: lo scrive
// il repo privato; se manca racconti.json (dati vecchi o fixture), il feed contiene solo le righe.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAtom } from './feed-atom.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'public', 'data');
export const SITE_URL = process.env['SITE_URL'] ?? 'https://zealous-sea-048183503.6.azurestaticapps.net';

const leggi = (nome) => (existsSync(join(DATA, nome)) ? JSON.parse(readFileSync(join(DATA, nome), 'utf8')) : []);
const racconti = leggi('racconti.json');
const righe = leggi('index.json');
const stats = existsSync(join(DATA, 'stats.json')) ? JSON.parse(readFileSync(join(DATA, 'stats.json'), 'utf8')) : {};
const xml = buildAtom({ site: SITE_URL, racconti, righe, aggiornato: stats.ultimo_build });
writeFileSync(join(ROOT, 'public', 'feed.xml'), xml, 'utf8');
console.log(`feed.xml: ${(xml.match(/<entry>/g) ?? []).length} elementi (${racconti.length} racconti, ${righe.length} righe in indice)`);
