import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (auth.autenticato) {
      <nav>
        <a class="brand" routerLink="/prossime">
          <span class="puntino"></span> AutoControlManager
        </a>
        <a class="link" routerLink="/prossime" routerLinkActive="attivo">
          <span class="icona">📅</span><span class="etichetta">Prossime</span>
        </a>
        <a class="link" routerLink="/auto" routerLinkActive="attivo">
          <span class="icona">🚗</span><span class="etichetta">Auto</span>
        </a>
        <a class="link" routerLink="/costi" routerLinkActive="attivo">
          <span class="icona">📊</span><span class="etichetta">Costi</span>
        </a>
        <button class="esci" (click)="auth.logout()">
          <span class="icona">🚪</span><span class="etichetta">Esci</span>
        </button>
      </nav>
    }
    <main>
      <router-outlet />
    </main>
  `,
})
export class AppComponent {
  auth = inject(AuthService);
}
