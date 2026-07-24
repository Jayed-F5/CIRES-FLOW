import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DemandeService, Demande } from '../../services/demande.service';
import { AuthService } from '../../services/auth.service';
import { Header } from '../../shared/header/header';
import { LucideSearch } from '@lucide/angular';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

interface Categorie {
  id: number;
  nom: string;
  departementId: number;
}

interface Departement {
  id: number;
  nom: string;
}

@Component({
  selector: 'app-mes-demandes',
  standalone: true,
  imports: [Header, CommonModule, RouterLink, LucideSearch],
  templateUrl: './mes-demandes.html',
  styleUrl: './mes-demandes.css',
})
export class MesDemandes implements OnInit {
  private demandeService = inject(DemandeService);
  private http = inject(HttpClient);
  authService = inject(AuthService);

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

  // Category dropdown: for Admin, scoped to whichever département is
  // selected. For everyone else, shows only categories that actually
  // appear in their own (already backend-scoped) results.
  filteredCategories = computed(() => {
    if (this.isAdmin()) {
      const deptId = this.selectedDepartementId();
      if (!deptId) return [];
      return this.allCategories().filter((c) => c.departementId === Number(deptId));
    }
    const usedIds = new Set(this.demandes().map((d) => d.categorieId));
    return this.allCategories().filter((c) => usedIds.has(c.id));
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

  readonly statutLabels: Record<string, string> = {
    NOUVEAU: 'NOUVEAU',
    EN_ATTENTE_APPROBATION: 'EN COURS',
    EN_COURS: 'EN COURS',
    RESOLU: 'RESOLU',
    CLOTURE: 'RESOLU',
    REJETE: 'REJETE',
    ANNULE: 'ANNULE',
  };

  readonly slaLabels: Record<string, string> = {
    RESPECTE: 'Respecté',
    A_RISQUE: 'À risque',
    DEPASSE: 'Dépassé',
    NON_APPLICABLE: '—',
  };

  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadDepartements(), this.loadAllCategories()]);
    await this.loadPage(1);
  }

  async loadDepartements(): Promise<void> {
    try {
      const depts = await firstValueFrom(
        this.http.get<Departement[]>(`${environment.apiUrl}/departement`),
      );
      this.departements.set(depts);
    } catch {
      // non-blocking
    }
  }

  async loadAllCategories(): Promise<void> {
    try {
      const cats = await firstValueFrom(
        this.http.get<Categorie[]>(`${environment.apiUrl}/categorie`),
      );
      this.allCategories.set(cats);
    } catch {
      // non-blocking
    }
  }

  categorieName(categorieId: number): string {
    return this.allCategories().find((c) => c.id === categorieId)?.nom ?? `Catégorie ${categorieId}`;
  }

  async loadPage(page: number): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.demandeService.getDemandes(page, 7, {
        search: this.searchTerm() || undefined,
        statut: this.selectedStatut() || undefined,
        departementId: this.selectedDepartementId() ? Number(this.selectedDepartementId()) : undefined,
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