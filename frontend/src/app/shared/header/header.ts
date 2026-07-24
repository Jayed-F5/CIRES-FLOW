import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LucideBell } from '@lucide/angular';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, LucideBell],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  authService = inject(AuthService);

  get initials(): string {
    // TODO: real user initials once /auth/me is wired into AuthService.
    // Currently falls back to the role's first letter since the JWT
    // payload only carries { sub, role, departementId } — no nom/prenom.
    const user = this.authService.user();
    if (!user) return '?';
    return user.role.charAt(0);
  }

  get displayName(): string {
  // TODO: replace with real nom/prenom from GET /auth/me after login.
  return 'Utilisateur';
}

  get roleLabel(): string {
    const role = this.authService.user()?.role;
    const labels: Record<string, string> = {
      EMPLOYE: 'Employé',
      AGENT: 'Agent',
      MANAGER: 'Manager',
      ADMIN: 'Administrateur',
    };
    return role ? (labels[role] ?? role) : '';
  }
}