import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

import { environment } from '../../environments/environment';

const CHIAVE_TOKEN = 'acm_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  token = signal<string | null>(localStorage.getItem(CHIAVE_TOKEN));

  login(username: string, password: string) {
    return this.http
      .post<{ access_token: string }>(`${environment.apiUrl}/auth/login`, {
        username,
        password,
      })
      .pipe(
        tap((r) => {
          localStorage.setItem(CHIAVE_TOKEN, r.access_token);
          this.token.set(r.access_token);
        }),
      );
  }

  logout() {
    localStorage.removeItem(CHIAVE_TOKEN);
    this.token.set(null);
    this.router.navigate(['/login']);
  }

  get autenticato() {
    return this.token() !== null;
  }
}
