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
        <a routerLink="/prossime" routerLinkActive="attivo">Prossime scadenze</a>
        <a routerLink="/auto" routerLinkActive="attivo">Auto</a>
        <button class="lieve" (click)="auth.logout()">Esci</button>
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

//commento per deploy automatico
