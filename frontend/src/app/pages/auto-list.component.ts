import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService } from '../core/api.service';
import { Auto } from '../core/models';

@Component({
  selector: 'app-auto-list',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <h2>Le mie auto</h2>

    @if (auto() === null) {
      <div class="stato-caricamento">
        <div class="spinner"></div>
        <p>Caricamento auto…</p>
      </div>
    } @else if (auto()!.length === 0) {
      <p class="vuoto">Nessuna auto registrata: aggiungine una qui sotto.</p>
    } @else {
      <div class="tabella-wrap">
        <table>
          <tr>
            <th>Nome</th>
            <th>Targa</th>
            <th>Modello</th>
            <th>Anno</th>
            <th></th>
          </tr>
          @for (a of auto(); track a.id) {
            <tr>
              <td><a [routerLink]="['/auto', a.id]">{{ a.nome }}</a></td>
              <td>{{ a.targa }}</td>
              <td>{{ a.modello }}</td>
              <td>{{ a.anno }}</td>
              <td>
                <button class="lieve" (click)="archivia(a)">Archivia</button>
              </td>
            </tr>
          }
        </table>
      </div>
    }

    <div class="card">
      <h3>Aggiungi auto</h3>
      @if ((auto() ?? []).length >= 5) {
        <p class="vuoto">Limite di 5 auto attive raggiunto.</p>
      } @else {
        <form (ngSubmit)="aggiungi()">
          <div class="riga">
            <label>
              Nome
              <input name="nome" placeholder="es. Panda di papà" [(ngModel)]="nuova.nome" required />
            </label>
            <label>
              Targa
              <input name="targa" placeholder="Targa" [(ngModel)]="nuova.targa" required />
            </label>
            <label>
              Modello
              <input name="modello" placeholder="Opzionale" [(ngModel)]="nuova.modello" />
            </label>
            <label>
              Anno
              <input name="anno" type="number" placeholder="Opzionale" [(ngModel)]="nuova.anno" />
            </label>
          </div>
          <div class="azioni-form">
            <button type="submit">Aggiungi</button>
          </div>
        </form>
      }
    </div>
  `,
})
export class AutoListComponent {
  private api = inject(ApiService);
  auto = signal<Auto[] | null>(null);
  nuova: Partial<Auto> = {};

  constructor() {
    this.ricarica();
  }

  private ricarica() {
    this.api.listaAuto().subscribe((a) => this.auto.set(a));
  }

  aggiungi() {
    if (!this.nuova.nome || !this.nuova.targa) return;
    this.api.creaAuto(this.nuova).subscribe(() => {
      this.nuova = {};
      this.ricarica();
    });
  }

  archivia(a: Auto) {
    if (!confirm(`Archiviare "${a.nome}"? Lo storico resta salvato.`)) return;
    this.api.disattivaAuto(a.id).subscribe(() => this.ricarica());
  }
}
