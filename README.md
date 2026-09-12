# lore-ledger-site

Viewer pubblico del ledger di [lore-ledger](https://github.com/labnova/lore-ledger) (repo privato), la casa editrice agentica: invenzioni, personaggi, gadget, contenuti e regioni di cinque universi, generati a lotti orari da estrazioni CSPRNG e mai modificati dopo la nascita. Il sito è in sola lettura ed è il pezzo di portfolio che spiega la pipeline (pagina `/m`).

Angular 21 (standalone, signals, control flow, `@angular/ssr` con prerender statico), nessun backend, CSS vanilla. Deploy su Azure Static Web Apps, piano Free.

## Architettura

```
repo privato labnova/lore-ledger              repo pubblico labnova/lore-ledger-site
ledger/**/*.yaml + bibbie/*.md                public/data/**  (JSON + bibbie, sola lettura)
        │                                             │
        │ engine/compile_site.py                      │ npm run build  (prerender: / /u/* /g /e /m)
        ▼                                             ▼
build/site-data/  ──publish-site-data.yml──▶  commit "data: ledger <sha>"  ──deploy.yml──▶  Azure SWA
                  (SITE_PUSH_TOKEN, PAT                                    (AZURE_STATIC_WEB_APPS_API_TOKEN)
                   contents:write su questo repo)
```

- Il repo privato compila il ledger in JSON e lo spinge in `public/data/` di questo repo. Mai YAML, log, skill, workflow o stato interno: solo il contratto sotto.
- Ogni push su `main` (codice o dati) ricostruisce il sito con prerender e lo pubblica su SWA.
- Il sito non ha API: `/r/:id` scarica `data/rows/<id>.json` dal browser; le pagine statiche vengono prerenderizzate a build.

## Route

| route | render | contenuto |
|---|---|---|
| `/` | prerender | feed: ultime 50 righe, filtri (tipo, universo, regione, relazione, poc/prod, testo), "carica altre", blocco stats |
| `/u/:universo` | prerender (5 universi) | bibbia in markdown, regioni, conteggi per tipo, ultime 20 righe |
| `/r/:id` | client | scheda riga: tutti i campi, madre e figlie con badge relazione, assi del personaggio, gadget/personaggi/contenuti collegati, "pescata come canone in" |
| `/g` | prerender + `@defer (on viewport)` | grafo D3 force-directed su `graph.json`, filtro universo e kind di arco, clic → `/r/:id` |
| `/e` | prerender | tabella cronologica delle estrazioni, clic → righe prodotte |
| `/m` | prerender | manifest, stats e spiegazione della pipeline |

Le pagine prerenderizzate incorporano nell'HTML solo uno snapshot ridotto (prime 50 righe del feed, prime 20 dell'universo, prime 50 estrazioni): `index.json`, `graph.json` ed `estrazioni.json` crescono con il ledger e il client li scarica dopo l'idratazione. `stats.json`, `manifest.json` e le bibbie passano dalla transfer cache di HttpClient.

## Sviluppo locale

Node 22, npm.

```bash
npm ci
npm run data:fixture   # rigenera public/data/ dalla fixture (12 righe, 3 universi, 1 regione, 2 figlie)
npm start              # http://localhost:4200
npm test               # vitest: parsing index/rows, filtri del feed, madre/figlie, collegamenti
npm run build          # dist/lore-ledger-site/browser con le route prerenderizzate
```

`public/data/` è committata con la fixture (`manifest.build: "fixture"`) così il sito si costruisce anche prima del primo push di dati. Al primo run di `publish-site-data` nel repo privato viene sostituita dai dati veri; `npm run data:fixture` la riporta alla fixture quando serve (la sorgente è in `fixture/`).

## Contratto dati (`public/data/`)

Prodotto da `engine/compile_site.py` del repo privato. JSON compatto, chiavi ordinate, UTF-8. Tipi TypeScript in `src/app/models/ledger.ts`.

| file | contenuto |
|---|---|
| `index.json` | array di righe leggere, `created` desc: `{id, tipo, universo, estrazione, created, parent_id, relazione, regione, titolo, sommario, poc?, prod?}` |
| `rows/<id>.json` | la riga completa, identica allo YAML del ledger (nessun campo aggiunto o rinominato) |
| `graph.json` | `{nodes: [{id, tipo, universo, titolo}], edges: [{from, to, kind}]}` con `kind ∈ parent, invenzione, personaggio, sorgente, regione` |
| `estrazioni.json` | log delle estrazioni in ordine di numero: `{estrazione, lotto, created, esito, forzata, campi_forzati, chiavi, righe_prodotte?, righe_attese?, canone_pescato?, espansioni?, …}` |
| `stats.json` | `{righe_per_tipo, righe_per_universo, regioni_per_universo, ultima_generazione, estrazioni_totali, ultimo_build}` |
| `manifest.json` | `{build, commit, schema_version}`; `build: "fixture"` per i dati di sviluppo |
| `bibbie/<universo>.md` | substrato dell'universo, markdown |

Campi comuni a ogni riga: `id, tipo, universo, estrazione, created, parent_id, relazione, epoca_relativa, regione, status, schema_version?`. Id: `<UNI>-<TIPO>-<nnnn>` con `UNI ∈ CYB NEO STE HAC ELA`, regioni `<UNI>-REG-<slug>`. Il campo `regione` delle righe porta il nome della regione (es. `Calvenna`), i log delle estrazioni l'id: il sito accetta entrambi.

Enum: `universo ∈ cyberverse | neofeudal | steamverse | hackverse | elabverse`; `relazione ∈ null | dialetto | evoluzione | vecchia_timeline | corruzione | espansione | adattamento | materializzazione`; `eta_fascia ∈ bambino | adolescente | giovane | adulto | maturo | anziano`.

## Deploy su Azure Static Web Apps

`.github/workflows/deploy.yml`: su push a `main` esegue `npm ci`, `npm test`, `npm run build` e carica `dist/lore-ledger-site/browser` con `Azure/static-web-apps-deploy@v1` (`skip_app_build: true`). `public/staticwebapp.config.json` finisce nella cartella pubblicata: fallback SPA su `index.csr.html` per `/r/*` e per le route sconosciute, `Cache-Control` di un anno su `/data/rows/*` (le righe sono immutabili) e di 5 minuti sul resto di `/data/*`.

Creazione una tantum della risorsa (piano Free, West Europe), con `az` CLI:

```bash
az login
az group create --name lore-ledger --location westeurope
az staticwebapp create \
  --name lore-ledger-site \
  --resource-group lore-ledger \
  --location westeurope \
  --sku Free
# token di deploy → secret del repo
az staticwebapp secrets list --name lore-ledger-site --resource-group lore-ledger \
  --query properties.apiKey -o tsv | gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --repo labnova/lore-ledger-site
# hostname pubblico
az staticwebapp show --name lore-ledger-site --resource-group lore-ledger --query defaultHostname -o tsv
```

Non collegare la risorsa a GitHub dal portale (creerebbe un secondo workflow): il deploy passa solo dal workflow di questo repo.

## Secret

| dove | nome | cosa |
|---|---|---|
| repo privato `labnova/lore-ledger` | `SITE_PUSH_TOKEN` | fine-grained PAT, *Only select repositories* → `labnova/lore-ledger-site`, permesso Contents: read and write. Usato da `publish-site-data.yml` per committare `public/data/`. |
| questo repo | `AZURE_STATIC_WEB_APPS_API_TOKEN` | token di deploy della Static Web App (comando sopra). |

## Fuori scope v1

Niente login, niente azioni del curatore (promuovi/veto), niente ricerca full-text, niente contenuti multimediali.
