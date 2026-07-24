import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LucideBell, LucideUser, LucideLogOut, LucideChevronDown } from '@lucide/angular';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, LucideBell, LucideUser, LucideLogOut, LucideChevronDown],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  authService = inject(AuthService);
  private elementRef = inject(ElementRef);

  menuOpen = signal(false);

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