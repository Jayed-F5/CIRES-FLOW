import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { MesDemandes } from './pages/mes-demandes/mes-demandes';
import { CreerDemande } from './pages/creer-demande/creer-demande';
import { FileGestion } from './pages/file-gestion/file-gestion';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { DetailDemande } from './pages/detail-demande/detail-demande';
import { GestionUtilisateurs } from './pages/gestion-utilisateurs/gestion-utilisateurs';
import { GestionDepartements } from './pages/gestion-departements/gestion-departements';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'mes-demandes', component: MesDemandes, canActivate: [authGuard] },
  { path: 'creer-demande', component: CreerDemande, canActivate: [authGuard] },
  { path: 'demande/:id', component: DetailDemande, canActivate: [authGuard] },
  { path: 'file-gestion', component: FileGestion, canActivate: [authGuard] },
  {
  path: 'gestion-departements',
  component: GestionDepartements,
  canActivate: [authGuard, roleGuard(['ADMIN'])],
},
  {
    path: 'gestion-utilisateurs',
    component: GestionUtilisateurs,
    canActivate: [authGuard, roleGuard(['ADMIN'])],
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' },
];