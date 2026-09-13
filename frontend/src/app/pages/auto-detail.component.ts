import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { Auto, Scadenza, TIPI_SCADENZA } from '../core/models';

@Component({
  selector: 'app-auto-detail',
  standalone: true,
  imports: [FormsModule, DatePipe, DecimalPipe],
  template: `
    @if (auto(); as a) {
      <h2>{{ a.nome }} <small>{{ a.targa }}</small></h2>
    }

    <h3>Storico e scadenze</h3>
    @if (scadenze() === null) {
      <div class="stato-caricamento">
        <div class="spinner"></div>
        <p>Caricamento…</p>
      </div>
    } @else if (scadenze()!.length === 0) {
      <p class="vuoto">Nessuna registrazione.</p>
    } @else {
      <div class="tabella-wrap">
        <table>
          <tr>
            <th>Tipo</th>
            <th>Eseguito il</th>
            <th>Km</th>
            <th>Prossima scadenza</th>
            <th>Costo</th>
            <th>Note</th>
            <th></th>
          </tr>
          @for (s of scadenze(); track s.id) {
            <tr>
              <td>{{ s.tipo }}</td>
              <td>{{ s.data_esecuzione | date: 'dd/MM/yyyy' }}</td>
              <td>{{ s.km_esecuzione }}</td>
              <td>{{ s.data_prossima_scadenza | date: 'dd/MM/yyyy' }}</td>
              <td>{{ s.costo ? (s.costo | number: '1.2-2') + ' €' : '' }}</td>
              <td>{{ s.note }}</td>
              <td><button class="lieve" (click)="elimina(s)">Elimina</button></td>
            </tr>
          }
        </table>
      </div>
    }

    <div class="card">
      <h3>Registra intervento / scadenza</h3>
      <form (ngSubmit)="salva()">
        <div class="riga">
          <label>
            Tipo
            <select name="tipo" [(ngModel)]="nuova.tipo">
              @for (t of tipi; track t) {
                <option [value]="t">{{ t }}</option>
              }
            </select>
          </label>
          <label>
            Eseguito il
            <input name="de" type="date" [(ngModel)]="nuova.data_esecuzione" />
          </label>
          <label>
            Km
            <input name="km" type="number" [(ngModel)]="nuova.km_esecuzione" />
          </label>
          <label>
            Prossima scadenza *
            <input
              name="dps"
              type="date"
              [(ngModel)]="nuova.data_prossima_scadenza"
              required
            />
          </label>
          <label>
            Costo
            <input name="costo" type="number" step="0.01" [(ngModel)]="nuova.costo" />
          </label>
          <label>
            Note
            <input name="note" placeholder="Officina, n° polizza…" [(ngModel)]="nuova.note" />
          </label>
        </div>

        @if (salvataggioInCorso()) {
          <div class="barra-progresso"><div class="barra-progresso-interna"></div></div>
        }

        <div class="azioni-form">
          <button type="submit" [disabled]="salvataggioInCorso()">
            @if (salvataggioInCorso()) {
              <span class="spinner-piccolo"></span> Salvataggio…
            } @else {
              Salva
            }
          </button>
        </div>
      </form>
    </div>

    @if (mostraConferma()) {
      <div class="toast-successo">
        <span class="segno">✓</span> Salvato
      </div>
    }
  `,
})
export class AutoDetailComponent implements OnInit {
  private api = inject(ApiService);

  /** id dalla rotta (withComponentInputBinding) */
  id = input.required<string>();

  tipi = TIPI_SCADENZA;
  auto = signal<Auto | null>(null);
  scadenze = signal<Scadenza[] | null>(null);
  nuova: Partial<Scadenza> = { tipo: 'TAGLIANDO' };
  salvataggioInCorso = signal(false);
  mostraConferma = signal(false);

  ngOnInit() {
    const autoId = Number(this.id());
    this.api
      .listaAuto(true)
      .subscribe((tutte) =>
        this.auto.set(tutte.find((a) => a.id === autoId) ?? null),
      );
    this.ricarica();
  }

  private ricarica() {
    this.api
      .listaScadenze(Number(this.id()))
      .subscribe((s) => this.scadenze.set(s));
  }

  salva() {
    if (!this.nuova.data_prossima_scadenza || this.salvataggioInCorso()) return;
    // i campi numerici vuoti arrivano come stringa '' dai form template-driven
    const payload: Partial<Scadenza> = {
      ...this.nuova,
      km_esecuzione: this.nuova.km_esecuzione || null,
      costo: this.nuova.costo || null,
      data_esecuzione: this.nuova.data_esecuzione || null,
      note: this.nuova.note || null,
    };
    this.salvataggioInCorso.set(true);
    this.api.creaScadenza(Number(this.id()), payload).subscribe({
      next: () => {
        this.nuova = { tipo: 'TAGLIANDO' };
        this.ricarica();
        this.salvataggioInCorso.set(false);
        this.mostraConferma.set(true);
        setTimeout(() => this.mostraConferma.set(false), 2400);
      },
      error: () => this.salvataggioInCorso.set(false),
    });
  }

  elimina(s: Scadenza) {
    if (!confirm('Eliminare questa registrazione?')) return;
    this.api.eliminaScadenza(s.id).subscribe(() => this.ricarica());
  }
}
