import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { MesDemandes } from './pages/mes-demandes/mes-demandes';
import { CreerDemande } from './pages/creer-demande/creer-demande';
import { authGuard } from './guards/auth.guard';
import { DetailDemande } from './pages/detail-demande/detail-demande';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'mes-demandes', component: MesDemandes, canActivate: [authGuard] },
  { path: 'creer-demande', component: CreerDemande, canActivate: [authGuard] },
  { path: 'demande/:id', component: DetailDemande, canActivate: [authGuard] },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' },
];