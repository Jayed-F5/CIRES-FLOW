import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Header } from '../../shared/header/header';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { LucideSearch } from '@lucide/angular';
import { UsersService, Utilisateur, Role } from '../../services/users.service';
import { DepartementService, Departement } from '../../services/departement.service';

interface NewUserForm {
  nom: string;
  prenom: string;
  email: string;
  motDePasse: string;
  role: Role;
  departementId: string;
}

@Component({
  selector: 'app-gestion-utilisateurs',
  standalone: true,
  imports: [Header, CommonModule, LucideSearch],
  templateUrl: './gestion-utilisateurs.html',
  styleUrl: './gestion-utilisateurs.css',
})
export class GestionUtilisateurs implements OnInit {
  private http = inject(HttpClient);
  private usersService = inject(UsersService);
  private departementService = inject(DepartementService);

  users = signal<Utilisateur[]>([]);
  departements = signal<Departement[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  searchTerm = signal('');
  roleFilter = signal<string>('');
  statutFilter = signal<string>('');

  editingUserId = signal<number | null>(null);
  editRole = signal<string>('');
  editDepartementId = signal<string>('');

  readonly roleOptions: Role[] = ['EMPLOYE', 'AGENT', 'MANAGER', 'ADMIN'];

  readonly roleLabels: Record<Role, string> = {
    EMPLOYE: 'Employé',
    AGENT: 'Agent',
    MANAGER: 'Manager',
    ADMIN: 'Administrateur',
  };

  // --- Création ---
  showCreateModal = signal(false);
  createSubmitting = signal(false);
  createError = signal<string | null>(null);
  newUser = signal<NewUserForm>({
    nom: '',
    prenom: '',
    email: '',
    motDePasse: '',
    role: 'EMPLOYE',
    departementId: '',
  });

  filteredUsers = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const role = this.roleFilter();
    const statut = this.statutFilter();

    return this.users().filter((u) => {
      const matchTerm =
        !term ||
        u.nom.toLowerCase().includes(term) ||
        u.prenom.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term);

      const matchRole = !role || u.role === role;
      const matchStatut =
        !statut || (statut === 'ACTIF' ? u.actif : !u.actif);

      return matchTerm && matchRole && matchStatut;
    });
  });

  readonly pageSize = 6;
currentPage = signal(1);

totalPages = computed(() =>
  Math.max(1, Math.ceil(this.filteredUsers().length / this.pageSize)),
);
pageNumbers = computed(() =>
  Array.from({ length: this.totalPages() }, (_, i) => i + 1),
);

paginatedUsers = computed(() => {
  const start = (this.currentPage() - 1) * this.pageSize;
  return this.filteredUsers().slice(start, start + this.pageSize);
});

  async ngOnInit(): Promise<void> {
    await this.loadAll();
  }

  async loadAll(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [users, depts] = await Promise.all([
        this.usersService.getUsers(),
        this.departementService.getDepartements(),
      ]);
      this.users.set(users);
      this.departements.set(depts);
    } catch {
      this.error.set('Erreur lors du chargement des utilisateurs.');
    } finally {
      this.loading.set(false);
    }
  }

  onSearchInput(value: string): void {
  this.searchTerm.set(value);
  this.currentPage.set(1);
}

onRoleFilterChange(value: string): void {
  this.roleFilter.set(value);
  this.currentPage.set(1);
}

onStatutFilterChange(value: string): void {
  this.statutFilter.set(value);
  this.currentPage.set(1);
}

  startEdit(user: Utilisateur): void {
    this.editingUserId.set(user.id);
    this.editRole.set(user.role);
    this.editDepartementId.set(user.departementId ? String(user.departementId) : '');
  }

  cancelEdit(): void {
    this.editingUserId.set(null);
  }

  onEditRoleChange(value: string): void {
    this.editRole.set(value);
  }

  onEditDepartementChange(value: string): void {
    this.editDepartementId.set(value);
  }

  async saveEdit(user: Utilisateur): Promise<void> {
    const payload: { role?: string; departementId?: number } = {
      role: this.editRole(),
    };
    if (this.editDepartementId()) {
      payload.departementId = Number(this.editDepartementId());
    }

    try {
      const updated = await this.usersService.updateUser(user.id, payload);
      this.users.update((list) =>
        list.map((u) => (u.id === updated.id ? updated : u)),
      );
      this.editingUserId.set(null);
    } catch {
      this.error.set("Erreur lors de la mise à jour de l'utilisateur.");
    }
  }

  async toggleStatut(user: Utilisateur): Promise<void> {
    try {
      const updated = await this.usersService.updateStatut(user.id, !user.actif);
      this.users.update((list) =>
        list.map((u) => (u.id === updated.id ? { ...u, actif: updated.actif } : u)),
      );
    } catch {
      this.error.set('Erreur lors du changement de statut.');
    }
  }

  // --- Création ---

  openCreateModal(): void {
    this.newUser.set({
      nom: '',
      prenom: '',
      email: '',
      motDePasse: '',
      role: 'EMPLOYE',
      departementId: '',
    });
    this.createError.set(null);
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  updateNewUserField(field: keyof NewUserForm, value: string): void {
    this.newUser.update((u) => ({ ...u, [field]: value }));
  }

  async submitCreateUser(): Promise<void> {
    const form = this.newUser();

    if (!form.nom || !form.prenom || !form.email || !form.motDePasse) {
      this.createError.set('Tous les champs obligatoires doivent être remplis.');
      return;
    }

    if (form.motDePasse.length < 8) {
      this.createError.set('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    this.createSubmitting.set(true);
    this.createError.set(null);

    try {
      const payload: any = {
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        motDePasse: form.motDePasse,
        role: form.role,
      };
      if (form.departementId) {
        payload.departementId = Number(form.departementId);
      }

      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/users`, payload),
      );

      this.showCreateModal.set(false);
      await this.loadAll();
    } catch (err: any) {
      this.createError.set(
        err?.error?.message ?? "Erreur lors de la création de l'utilisateur.",
      );
    } finally {
      this.createSubmitting.set(false);
    }
  }
  goToPage(page: number): void {
  if (page < 1 || page > this.totalPages()) return;
  this.currentPage.set(page);
}

nextPage(): void {
  this.goToPage(this.currentPage() + 1);
}

previousPage(): void {
  this.goToPage(this.currentPage() - 1);
}
}
