import { Routes } from '@angular/router';

import { authGuard } from './core/auth.guard';
import { AutoDetailComponent } from './pages/auto-detail.component';
import { AutoListComponent } from './pages/auto-list.component';
import { CostiComponent } from './pages/costi.component';
import { LoginComponent } from './pages/login.component';
import { ProssimeComponent } from './pages/prossime.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'prossime', component: ProssimeComponent, canActivate: [authGuard] },
  { path: 'auto', component: AutoListComponent, canActivate: [authGuard] },
  { path: 'auto/:id', component: AutoDetailComponent, canActivate: [authGuard] },
  { path: 'costi', component: CostiComponent, canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'prossime' },
  { path: '**', redirectTo: 'prossime' },
];
