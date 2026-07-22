import { Component, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div style="padding: 40px;">
      <h1>Tableau de Bord</h1>
      <p>Connecté en tant que rôle : {{ authService.user()?.role }}</p>
      <button (click)="authService.logout()">Se déconnecter</button>
    </div>
  `,
})
export class Dashboard {
  authService = inject(AuthService);
}