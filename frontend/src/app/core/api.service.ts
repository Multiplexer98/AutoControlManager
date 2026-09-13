import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../environments/environment';
import { Auto, Scadenza, ScadenzaProssima } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // --- auto ---
  listaAuto(includiInattive = false) {
    return this.http.get<Auto[]>(
      `${this.base}/auto?includi_inattive=${includiInattive}`,
    );
  }

  creaAuto(a: Partial<Auto>) {
    return this.http.post<Auto>(`${this.base}/auto`, a);
  }

  aggiornaAuto(id: number, a: Partial<Auto>) {
    return this.http.put<Auto>(`${this.base}/auto/${id}`, a);
  }

  disattivaAuto(id: number) {
    return this.http.delete<void>(`${this.base}/auto/${id}`);
  }

  // --- scadenze ---
  listaScadenze(autoId: number) {
    return this.http.get<Scadenza[]>(`${this.base}/auto/${autoId}/scadenze`);
  }

  creaScadenza(autoId: number, s: Partial<Scadenza>) {
    return this.http.post<Scadenza>(`${this.base}/auto/${autoId}/scadenze`, s);
  }

  aggiornaScadenza(id: number, s: Partial<Scadenza>) {
    return this.http.put<Scadenza>(`${this.base}/scadenze/${id}`, s);
  }

  eliminaScadenza(id: number) {
    return this.http.delete<void>(`${this.base}/scadenze/${id}`);
  }

  prossimeScadenze(giorni = 90) {
    return this.http.get<ScadenzaProssima[]>(
      `${this.base}/scadenze/prossime?giorni=${giorni}`,
    );
  }
}
