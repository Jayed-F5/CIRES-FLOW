import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, debounceTime } from 'rxjs';
import {
  DemandeService,
  Demande,
  STATUT_LABELS_DETAIL,
  SLA_LABELS,
} from '../../services/demande.service';
import { DepartementService, Departement, Categorie } from '../../services/departement.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { Header } from '../../shared/header/header';
import { LucideSearch } from '@lucide/angular';

@Component({
  selector: 'app-mes-demandes',
  standalone: true,
  imports: [Header, CommonModule, RouterLink, LucideSearch],
  templateUrl: './mes-demandes.html',
  styleUrl: './mes-demandes.css',
})
export class MesDemandes implements OnInit, OnDestroy {
  private demandeService = inject(DemandeService);
  private departementService = inject(DepartementService);
  private notificationService = inject(NotificationService);
  authService = inject(AuthService);

  private newNotificationSub?: Subscription;

  loading = signal(true);
  error = signal<string | null>(null);

  demandes = signal<Demande[]>([]);
  departements = signal<Departement[]>([]);
  allCategories = signal<Categorie[]>([]);
  page = signal(1);
  totalPages = signal(1);
  total = signal(0);

  searchTerm = signal('');
  selectedStatut = signal('');
  selectedDepartementId = signal('');
  selectedCategorieId = signal('');

  isAdmin = computed(() => this.authService.user()?.role === 'ADMIN');
  canFilterByDepartement = computed(() => {
    const role = this.authService.user()?.role;
    return role === 'ADMIN' || role === 'MANAGER';
  });
  // Liste déroulante des catégories : pour un Admin, limitée au département
  // sélectionné. Pour les autres rôles, n'affiche que les catégories qui
  // apparaissent réellement dans leurs propres résultats (déjà filtrés côté backend).
  filteredCategories = computed(() => {
    const deptId = this.selectedDepartementId();
    if (!deptId) return [];
    return this.allCategories().filter((c) => c.departementId === Number(deptId));
  });

  readonly statutOptions = [
    { value: '', label: 'Tous les Statuts' },
    { value: 'NOUVEAU', label: 'Nouveau' },
    { value: 'EN_ATTENTE_APPROBATION', label: "En attente d'approbation" },
    { value: 'EN_COURS', label: 'En cours' },
    { value: 'RESOLU', label: 'Résolu' },
    { value: 'CLOTURE', label: 'Clôturé' },
    { value: 'REJETE', label: 'Rejeté' },
    { value: 'ANNULE', label: 'Annulé' },
  ];

  pageNumbers = computed(() => {
    const total = this.totalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  readonly statutLabels = STATUT_LABELS_DETAIL;
  readonly slaLabels = SLA_LABELS;

  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadDepartements(), this.loadAllCategories()]);
    await this.loadPage(1);

    // Se resynchronise sur la page courante dès qu'une notification arrive
    // (ex. changement de statut, approbation) au lieu d'attendre un rechargement
    // manuel de la page. Le debounce évite de relancer plusieurs requêtes quand
    // plusieurs notifications arrivent d'un coup pour le même événement métier.
    this.newNotificationSub = this.notificationService.newNotification$
      .pipe(debounceTime(800))
      .subscribe(() => this.loadPage(this.page()));
  }

  ngOnDestroy(): void {
    this.newNotificationSub?.unsubscribe();
  }

  async loadDepartements(): Promise<void> {
    try {
      const depts = await this.departementService.getDepartements();
      this.departements.set(depts);
    } catch {
      // non bloquant
    }
  }

  async loadAllCategories(): Promise<void> {
    try {
      const cats = await this.departementService.getCategories();
      this.allCategories.set(cats);
    } catch {
      // non bloquant
    }
  }

  categorieName(categorieId: number): string {
    return (
      this.allCategories().find((c) => c.id === categorieId)?.nom ?? `Catégorie ${categorieId}`
    );
  }

  async loadPage(page: number): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.demandeService.getDemandes(page, 7, {
        search: this.searchTerm() || undefined,
        statut: this.selectedStatut() || undefined,
        departementId: this.selectedDepartementId()
          ? Number(this.selectedDepartementId())
          : undefined,
        categorieId: this.selectedCategorieId() ? Number(this.selectedCategorieId()) : undefined,
      });
      this.demandes.set(result.data);
      this.page.set(result.page);
      this.totalPages.set(result.totalPages);
      this.total.set(result.total);
    } catch (err) {
      this.error.set('Impossible de charger les demandes');
    } finally {
      this.loading.set(false);
    }
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.loadPage(1), 400);
  }

  onStatutChange(value: string): void {
    this.selectedStatut.set(value);
    this.loadPage(1);
  }

  onDepartementChange(value: string): void {
    this.selectedDepartementId.set(value);
    this.selectedCategorieId.set('');
    this.loadPage(1);
  }

  onCategorieChange(value: string): void {
    this.selectedCategorieId.set(value);
    this.loadPage(1);
  }

  goToPage(page: number): void {
    if (page !== this.page()) {
      this.loadPage(page);
    }
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) {
      this.loadPage(this.page() + 1);
    }
  }

  prevPage(): void {
    if (this.page() > 1) {
      this.loadPage(this.page() - 1);
    }
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR');
  }

  get greetingName(): string {
    const role = this.authService.user()?.role;
    const labels: Record<string, string> = {
      EMPLOYE: 'Employé',
      AGENT: 'Agent',
      MANAGER: 'Manager',
      ADMIN: 'Admin',
    };
    return role ? (labels[role] ?? 'Utilisateur') : 'Utilisateur';
  }
}