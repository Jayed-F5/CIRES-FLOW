import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';import { AuthService } from '../../services/auth.service';
import {LucideBell,LucideUser,LucideLogOut,LucideChevronDown,LucideLayoutDashboard,LucideClipboardList,LucideFilePlus,LucideListChecks,} from '@lucide/angular';
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    LucideBell,
    LucideUser,
    LucideLogOut,
    LucideChevronDown,
    LucideLayoutDashboard,
    LucideClipboardList,
    LucideFilePlus,
    LucideListChecks,
  ],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  authService = inject(AuthService);
  private elementRef = inject(ElementRef);

  menuOpen = signal(false);

  get navLinks(): { path: string; label: string; icon: string }[] {
    const role = this.authService.user()?.role;
    const links = [
      { path: '/dashboard', label: 'Tableau de Bord', icon: 'dashboard' },
      { path: '/mes-demandes', label: 'Mes Demandes', icon: 'demandes' },
      { path: '/creer-demande', label: 'Nouvelle Demande', icon: 'nouvelle' },
    ];

    if (role === 'AGENT' || role === 'MANAGER' || role === 'ADMIN') {
      links.push({ path: '/file-gestion', label: 'File de Gestion', icon: 'file' });
    }

    // Admin-only pages will be appended here as they're built:
    // Gestion Utilisateurs, Départements/Catégories, Circuits d'Approbation, Configuration SLA

    return links;
  }

  get initials(): string {
    const user = this.authService.user();
    if (!user) return '?';
    return user.role.charAt(0);
  }

  get displayName(): string {
    // TODO: replace with real nom/prenom from GET /auth/me after login.
    return this.roleLabel;
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

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.closeMenu();
    this.authService.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeMenu();
    }
  }
}