import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="card" style="max-width:360px;margin:4rem auto">
      <h2>AutoControlManager</h2>
      <form (ngSubmit)="entra()">
        <label>
          Utente
          <input name="username" [(ngModel)]="username" autocomplete="username" />
        </label>
        <label style="margin-top:0.85rem">
          Password
          <input
            name="password"
            type="password"
            [(ngModel)]="password"
            autocomplete="current-password"
          />
        </label>

        @if (errore()) {
          <p class="errore" style="margin-top:0.85rem">{{ errore() }}</p>
        }

        <button type="submit" [disabled]="attesa()" style="width:100%;margin-top:1.1rem">
          @if (attesa()) {
            <span class="spinner-piccolo"></span> Attendi…
          } @else {
            Entra
          }
        </button>
      </form>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  errore = signal('');
  attesa = signal(false);

  entra() {
    this.errore.set('');
    this.attesa.set(true);
    this.auth.login(this.username, this.password).subscribe({
      next: () => this.router.navigate(['/prossime']),
      error: (e) => {
        // il backend free su Render può impiegare ~30-60s a svegliarsi
        this.errore.set(
          e.status === 401
            ? 'Credenziali non valide'
            : 'Backend non raggiungibile (può essere in avvio, riprova tra poco)',
        );
        this.attesa.set(false);
      },
    });
  }
}
