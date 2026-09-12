import { Component, inject, resource } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Ledger } from './data/ledger-api';
import { UNIVERSI } from './models/ledger';
import { UNIVERSO_LABEL } from './data/labels';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
})
export class App {
  private readonly ledger = inject(Ledger);
  readonly universi = UNIVERSI;
  readonly universoLabel = UNIVERSO_LABEL;
  readonly manifest = resource({ loader: () => this.ledger.manifest() });
}
