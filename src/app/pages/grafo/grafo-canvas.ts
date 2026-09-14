import {
  Component,
  ElementRef,
  ViewEncapsulation,
  afterRenderEffect,
  computed,
  inject,
  input,
  resource,
  untracked,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  Simulation,
  SimulationLinkDatum,
  SimulationNodeDatum,
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
} from 'd3-force';
import { select } from 'd3-selection';
import { drag } from 'd3-drag';
import { zoom } from 'd3-zoom';
import {
  symbol,
  symbolCircle,
  symbolCross,
  symbolDiamond,
  symbolSquare,
  symbolStar,
  symbolTriangle,
  symbolWye,
} from 'd3-shape';
import { Ledger } from '../../data/ledger-api';
import { EDGE_KINDS, EdgeKind, Graph, GraphNode, Tipo, Universo } from '../../models/ledger';
import { TIPO_LABEL, UNIVERSO_LABEL } from '../../data/labels';

interface Nodo extends SimulationNodeDatum, GraphNode {}
interface Arco extends SimulationLinkDatum<Nodo> {
  kind: EdgeKind;
}

const FORMA: Record<Tipo, string> = {
  invenzione: symbol(symbolCircle, 110)()!,
  personaggio: symbol(symbolSquare, 110)()!,
  gadget: symbol(symbolDiamond, 110)()!,
  contenuto: symbol(symbolTriangle, 110)()!,
  seme: symbol(symbolStar, 130)()!,
  regione: symbol(symbolWye, 130)()!,
  fatto: symbol(symbolCross, 110)()!,
};

const MAX_ETICHETTE = 150;
const MAX_ELENCO = 400;

/**
 * Grafo force-directed su `graph.json`. Il DOM dell'SVG è gestito da d3, quindi gli stili sono
 * globali (`ViewEncapsulation.None`). Sotto al grafo c'è l'elenco testuale dei nodi: la stessa
 * informazione raggiungibile da tastiera e da screen reader.
 */
@Component({
  selector: 'app-grafo-canvas',
  imports: [RouterLink],
  encapsulation: ViewEncapsulation.None,
  template: `
    @if (grafo.hasValue()) {
      <p class="mono muted" aria-live="polite">
        {{ filtrato().nodes.length }} nodi · {{ filtrato().edges.length }} archi
      </p>
      <div class="grafo-legenda" aria-label="Legenda">
        @for (t of tipi; track t) {
          <span class="legenda-voce">
            <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
              <path [attr.d]="forma[t]" transform="scale(0.55)" />
            </svg>
            {{ tipoLabel[t] }}
          </span>
        }
        @for (u of universi; track u) {
          <span class="legenda-voce uni-{{ u }}">
            <span class="uni-dot" aria-hidden="true"></span>{{ universoLabel[u] }}
          </span>
        }
      </div>
      <svg
        #svg
        class="grafo"
        role="img"
        [attr.aria-label]="
          'Grafo: ' + filtrato().nodes.length + ' nodi, ' + filtrato().edges.length + ' archi'
        "
      ></svg>
      <details>
        <summary>Elenco dei nodi ({{ filtrato().nodes.length }})</summary>
        <ul class="lista-righe">
          @for (n of filtrato().nodes.slice(0, maxElenco); track n.id) {
            <li>
              <a class="mono" [routerLink]="['/r', n.id]">{{ n.id }}</a>
              <span>{{ n.titolo }}</span>
              <span class="badge badge-tipo">{{ n.tipo }}</span>
              <span class="badge badge-uni uni-{{ n.universo }}">{{ universoLabel[n.universo] }}</span>
            </li>
          }
        </ul>
        @if (filtrato().nodes.length > maxElenco) {
          <p class="muted">Elenco troncato a {{ maxElenco }} nodi; usa i filtri o il feed.</p>
        }
      </details>
    } @else if (grafo.error()) {
      <p role="alert">Grafo non disponibile: {{ grafo.error() }}</p>
    } @else {
      <p class="muted">Caricamento di graph.json…</p>
    }
  `,
  styles: `
    .grafo {
      display: block;
      width: 100%;
      height: min(70vh, 40rem);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--bg-2);
      touch-action: none;
    }
    .grafo .arco {
      stroke: var(--fg-2);
      stroke-opacity: 0.45;
      stroke-width: 1;
    }
    .grafo .arco-parent {
      stroke-width: 2;
      stroke-dasharray: 4 3;
    }
    .grafo .nodo {
      cursor: pointer;
    }
    .grafo .nodo path {
      stroke: var(--bg);
      stroke-width: 1.2;
    }
    .grafo .nodo text {
      font-family: var(--font-mono);
      font-size: 10px;
      fill: var(--fg);
      pointer-events: none;
    }
    .grafo .nodo.uni-cyberverse path,
    .legenda-voce.uni-cyberverse {
      fill: var(--uni-cyberverse);
      color: var(--uni-cyberverse);
    }
    .grafo .nodo.uni-neofeudal path,
    .legenda-voce.uni-neofeudal {
      fill: var(--uni-neofeudal);
      color: var(--uni-neofeudal);
    }
    .grafo .nodo.uni-steamverse path,
    .legenda-voce.uni-steamverse {
      fill: var(--uni-steamverse);
      color: var(--uni-steamverse);
    }
    .grafo .nodo.uni-hackverse path,
    .legenda-voce.uni-hackverse {
      fill: var(--uni-hackverse);
      color: var(--uni-hackverse);
    }
    .grafo .nodo.uni-elabverse path,
    .legenda-voce.uni-elabverse {
      fill: var(--uni-elabverse);
      color: var(--uni-elabverse);
    }
    .grafo-legenda {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 1rem;
      font-size: 0.85rem;
      margin: 0.5rem 0;
    }
    .legenda-voce {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
    .legenda-voce svg path {
      fill: var(--fg);
    }
    .grafo-placeholder {
      min-height: 12rem;
      border: 1px dashed var(--line);
      border-radius: var(--radius);
      display: grid;
      place-items: center;
      color: var(--fg-2);
    }
    .kinds {
      border: 0;
      padding: 0;
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 1rem;
    }
    .kinds legend {
      font-size: 0.85rem;
      color: var(--fg-2);
    }
  `,
})
export class GrafoCanvas {
  private readonly ledger = inject(Ledger);
  private readonly router = inject(Router);

  readonly universo = input<Universo | ''>('');
  readonly kinds = input<EdgeKind[]>(EDGE_KINDS);

  readonly tipi = Object.keys(FORMA) as Tipo[];
  readonly universi = Object.keys(UNIVERSO_LABEL) as Universo[];
  readonly forma = FORMA;
  readonly tipoLabel = TIPO_LABEL;
  readonly universoLabel = UNIVERSO_LABEL;
  readonly maxElenco = MAX_ELENCO;

  private readonly svgRef = viewChild<ElementRef<SVGSVGElement>>('svg');
  private sim: Simulation<Nodo, Arco> | null = null;

  readonly grafo = resource({ loader: () => this.ledger.graph() });

  readonly filtrato = computed<Graph>(() => {
    if (!this.grafo.hasValue()) return { nodes: [], edges: [] };
    const g = this.grafo.value();
    const u = this.universo();
    const kinds = new Set(this.kinds());
    const nodes = u ? g.nodes.filter((n) => n.universo === u) : g.nodes;
    const ids = new Set(nodes.map((n) => n.id));
    const edges = g.edges.filter((e) => kinds.has(e.kind) && ids.has(e.from) && ids.has(e.to));
    return { nodes, edges };
  });

  constructor() {
    afterRenderEffect(() => {
      const g = this.filtrato();
      const svg = this.svgRef()?.nativeElement;
      if (!svg) return;
      untracked(() => this.disegna(svg, g));
    });
  }

  private disegna(el: SVGSVGElement, g: Graph): void {
    this.sim?.stop();
    const width = el.clientWidth || 800;
    const height = el.clientHeight || 500;
    const svg = select(el);
    svg.selectAll('*').remove();
    const root = svg.append('g');

    const nodes: Nodo[] = g.nodes.map((n) => ({ ...n }));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const links: Arco[] = g.edges.map((e) => ({
      source: byId.get(e.from)!,
      target: byId.get(e.to)!,
      kind: e.kind,
    }));

    const arco = root
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('class', (d) => `arco arco-${d.kind}`);

    const nodo = root
      .append('g')
      .selectAll<SVGGElement, Nodo>('g')
      .data(nodes)
      .join('g')
      .attr('class', (d) => `nodo uni-${d.universo}`)
      .on('click', (_ev, d) => void this.router.navigate(['/r', d.id]));
    nodo.append('path').attr('d', (d) => FORMA[d.tipo]);
    nodo.append('title').text((d) => `${d.id} — ${d.titolo} (${d.tipo}, ${d.universo})`);
    if (nodes.length <= MAX_ETICHETTE) {
      nodo
        .append('text')
        .attr('dx', 9)
        .attr('dy', 4)
        .text((d) => d.titolo || d.id);
    }

    const sim = forceSimulation<Nodo>(nodes)
      .force(
        'link',
        forceLink<Nodo, Arco>(links)
          .id((d) => d.id)
          .distance(48),
      )
      .force('charge', forceManyBody().strength(-160))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide(14))
      .on('tick', () => {
        arco
          .attr('x1', (d) => (d.source as Nodo).x ?? 0)
          .attr('y1', (d) => (d.source as Nodo).y ?? 0)
          .attr('x2', (d) => (d.target as Nodo).x ?? 0)
          .attr('y2', (d) => (d.target as Nodo).y ?? 0);
        nodo.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });
    this.sim = sim;

    nodo.call(
      drag<SVGGElement, Nodo>()
        .on('start', (ev, d) => {
          if (!ev.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (ev, d) => {
          d.fx = ev.x;
          d.fy = ev.y;
        })
        .on('end', (ev, d) => {
          if (!ev.active) sim.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }),
    );

    svg.call(
      zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 6])
        .on('zoom', (ev) => root.attr('transform', ev.transform.toString())),
    );
  }
}
