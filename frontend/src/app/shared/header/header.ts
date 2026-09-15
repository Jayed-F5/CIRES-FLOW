import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService, Notification } from '../../services/notification.service';
import {
  LucideBell,
  LucideUser,
  LucideLogOut,
  LucideChevronDown,
  LucideLayoutDashboard,
  LucideClipboardList,
  LucideFilePlus,
  LucideListChecks,
  LucideUsers,
  LucideBuilding2,
  LucideWorkflow,
  LucideMenu,
  LucideX,
} from '@lucide/angular';
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
    LucideUsers,
    LucideBuilding2,
    LucideWorkflow,
    LucideMenu,
    LucideX,
  ],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  authService = inject(AuthService);
  notificationService = inject(NotificationService);
  private elementRef = inject(ElementRef);
  private router = inject(Router);

  menuOpen = signal(false);
  notifMenuOpen = signal(false);
  mobileNavOpen = signal(false);

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.notificationService.connect();
      this.notificationService.loadInitial();
    }
  }

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

    if (role === 'ADMIN') {
      links.push({ path: '/gestion-utilisateurs', label: 'Utilisateurs', icon: 'users' });
      links.push({ path: '/gestion-departements', label: 'Départements', icon: 'departements' });
      links.push({ path: '/gestion-workflow', label: 'Circuits', icon: 'workflow' });
    }

    return links;
  }

  get initials(): string {
    const user = this.authService.user();
    if (!user) return '?';
    return user.role.charAt(0);
  }

  get displayName(): string {
    const user = this.authService.user();
    if (user?.prenom && user?.nom) {
      return `${user.prenom} ${user.nom}`;
    }
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
    this.notifMenuOpen.set(false);
  }

  toggleMobileNav(): void {
    this.mobileNavOpen.update((v) => !v);
    this.menuOpen.set(false);
    this.notifMenuOpen.set(false);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  toggleNotifMenu(): void {
    this.notifMenuOpen.update((v) => !v);
    this.menuOpen.set(false);
  }

  closeNotifMenu(): void {
    this.notifMenuOpen.set(false);
  }

  loadMoreNotifications(): void {
    void this.notificationService.loadMore();
  }

  async onNotificationClick(notif: Notification): Promise<void> {
    if (!notif.lu) {
      await this.notificationService.markAsRead(notif.id);
    }
    this.closeNotifMenu();
    if (notif.lien) {
      this.router.navigateByUrl(notif.lien);
    }
  }

  async markAllRead(): Promise<void> {
    await this.notificationService.markAllAsRead();
  }

  formatNotifDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  logout(): void {
    this.closeMenu();
    this.notificationService.disconnect();
    this.authService.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeMenu();
      this.closeNotifMenu();
      this.closeMobileNav();
    }
  }
}