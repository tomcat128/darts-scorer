import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatchStoreService } from './core/services/match-store.service';

function activeMatchGuard(): boolean {
  const matchStore = inject(MatchStoreService);
  if (matchStore.hasActiveMatch()) {
    return true;
  }
  inject(Router).navigate(['/new-match']);
  return false;
}

export const routes: Routes = [
  { path: '', redirectTo: 'roster', pathMatch: 'full' },
  {
    path: 'roster',
    loadComponent: () => import('./features/roster/roster-page/roster-page').then((m) => m.RosterPage),
  },
  {
    path: 'new-match',
    loadComponent: () =>
      import('./features/match-setup/match-setup-page/match-setup-page').then((m) => m.MatchSetupPage),
  },
  {
    path: 'match',
    loadComponent: () => import('./features/match/match-page/match-page').then((m) => m.MatchPage),
    canActivate: [activeMatchGuard],
  },
  { path: '**', redirectTo: 'roster' },
];
