import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiService } from '../core/api.service';
import { ScadenzaProssima } from '../core/models';

@Component({
  selector: 'app-prossime',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <h2>Prossime scadenze</h2>

    @if (scadenze() === null) {
      <div class="stato-caricamento">
        <div class="spinner"></div>
        <p>Caricamento scadenze…</p>
      </div>
    } @else if (scadenze()!.length === 0) {
      <p class="vuoto">Nessuna scadenza nei prossimi 90 giorni.</p>
    } @else {
      <div class="tabella-wrap">
        <table>
          <tr>
            <th>Auto</th>
            <th>Tipo</th>
            <th>Scadenza</th>
            <th>Mancano</th>
            <th>Note</th>
          </tr>
          @for (s of scadenze(); track s.id) {
            <tr [class.urgente]="s.giorni_mancanti <= 30">
              <td>
                <a [routerLink]="['/auto', s.auto_id]">{{ s.auto_nome }}</a>
                <small>{{ s.targa }}</small>
              </td>
              <td>{{ s.tipo }}</td>
              <td>{{ s.data_prossima_scadenza | date: 'dd/MM/yyyy' }}</td>
              <td>
                {{ s.giorni_mancanti < 0 ? 'scaduta' : s.giorni_mancanti + ' gg' }}
              </td>
              <td>{{ s.note }}</td>
            </tr>
          }
        </table>
      </div>
    }
  `,
})
export class ProssimeComponent {
  private api = inject(ApiService);
  scadenze = signal<ScadenzaProssima[] | null>(null);

  constructor() {
    this.api.prossimeScadenze().subscribe((s) => this.scadenze.set(s));
  }
}
