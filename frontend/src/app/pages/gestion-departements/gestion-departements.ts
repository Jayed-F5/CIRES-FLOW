import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Header } from '../../shared/header/header';
import {
  DepartementService,
  Departement,
  Categorie,
} from '../../services/departement.service';

interface DepartementForm {
  nom: string;
}

interface CategorieForm {
  nom: string;
  delaiReponse: string;
  delaiResolution: string;
}

@Component({
  selector: 'app-gestion-departements',
  standalone: true,
  imports: [Header, CommonModule],
  templateUrl: './gestion-departements.html',
  styleUrl: './gestion-departements.css',
})
export class GestionDepartements implements OnInit {
  private departementService = inject(DepartementService);

  departements = signal<Departement[]>([]);
  categories = signal<Categorie[]>([]);
  selectedDepartementId = signal<number | null>(null);

  loading = signal(true);
  error = signal<string | null>(null);

  categoriesForSelected = computed(() => {
    const deptId = this.selectedDepartementId();
    if (!deptId) return [];
    return this.categories().filter((c) => c.departementId === deptId);
  });

  selectedDepartement = computed(() =>
    this.departements().find((d) => d.id === this.selectedDepartementId()) ?? null,
  );

  // --- Pagination Départements ---
  readonly deptPageSize = 5;
  deptCurrentPage = signal(1);
  deptTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.departements().length / this.deptPageSize)),
  );
  deptPageNumbers = computed(() =>
    Array.from({ length: this.deptTotalPages() }, (_, i) => i + 1),
  );
  paginatedDepartements = computed(() => {
    const start = (this.deptCurrentPage() - 1) * this.deptPageSize;
    return this.departements().slice(start, start + this.deptPageSize);
  });

  goToDeptPage(page: number): void {
    if (page < 1 || page > this.deptTotalPages()) return;
    this.deptCurrentPage.set(page);
  }

  nextDeptPage(): void {
    this.goToDeptPage(this.deptCurrentPage() + 1);
  }

  previousDeptPage(): void {
    this.goToDeptPage(this.deptCurrentPage() - 1);
  }

  // --- Pagination Catégories ---
  readonly catPageSize = 6;
  catCurrentPage = signal(1);
  catTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.categoriesForSelected().length / this.catPageSize)),
  );
  catPageNumbers = computed(() =>
    Array.from({ length: this.catTotalPages() }, (_, i) => i + 1),
  );
  paginatedCategories = computed(() => {
    const start = (this.catCurrentPage() - 1) * this.catPageSize;
    return this.categoriesForSelected().slice(start, start + this.catPageSize);
  });

  goToCatPage(page: number): void {
    if (page < 1 || page > this.catTotalPages()) return;
    this.catCurrentPage.set(page);
  }

  nextCatPage(): void {
    this.goToCatPage(this.catCurrentPage() + 1);
  }

  previousCatPage(): void {
    this.goToCatPage(this.catCurrentPage() - 1);
  }

  // --- Modales Département ---
  showDeptModal = signal(false);
  editingDeptId = signal<number | null>(null);
  deptForm = signal<DepartementForm>({ nom: '' });
  deptSubmitting = signal(false);
  deptError = signal<string | null>(null);

  // --- Modales Catégorie ---
  showCatModal = signal(false);
  editingCatId = signal<number | null>(null);
  catForm = signal<CategorieForm>({ nom: '', delaiReponse: '', delaiResolution: '' });
  catSubmitting = signal(false);
  catError = signal<string | null>(null);

  // --- Modale de confirmation ---
showConfirmModal = signal(false);
confirmMessage = signal('');
private confirmAction: (() => void) | null = null;

askConfirm(message: string, action: () => void): void {
  this.confirmMessage.set(message);
  this.confirmAction = action;
  this.showConfirmModal.set(true);
}

closeConfirmModal(): void {
  this.showConfirmModal.set(false);
  this.confirmAction = null;
}

confirmYes(): void {
  const action = this.confirmAction;
  this.showConfirmModal.set(false);
  this.confirmAction = null;
  action?.();
}
  async ngOnInit(): Promise<void> {
    await this.loadAll();
  }

  async loadAll(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [depts, cats] = await Promise.all([
        this.departementService.getDepartements(),
        this.departementService.getCategories(),
      ]);
      this.departements.set(depts);
      this.categories.set(cats);
      if (!this.selectedDepartementId() && depts.length > 0) {
        this.selectedDepartementId.set(depts[0].id);
      }
      this.deptCurrentPage.set(Math.min(this.deptCurrentPage(), this.deptTotalPages()));
      this.catCurrentPage.set(Math.min(this.catCurrentPage(), this.catTotalPages()));
    } catch {
      this.error.set('Erreur lors du chargement des départements.');
    } finally {
      this.loading.set(false);
    }
  }

  selectDepartement(id: number): void {
    this.selectedDepartementId.set(id);
    this.catCurrentPage.set(1);
  }

  // --- CRUD Département ---

  openCreateDept(): void {
    this.editingDeptId.set(null);
    this.deptForm.set({ nom: '' });
    this.deptError.set(null);
    this.showDeptModal.set(true);
  }

  openEditDept(dept: Departement): void {
    this.editingDeptId.set(dept.id);
    this.deptForm.set({ nom: dept.nom });
    this.deptError.set(null);
    this.showDeptModal.set(true);
  }

  closeDeptModal(): void {
    this.showDeptModal.set(false);
  }

  updateDeptField(value: string): void {
    this.deptForm.set({ nom: value });
  }

  async submitDept(): Promise<void> {
    const form = this.deptForm();
    if (!form.nom.trim()) {
      this.deptError.set('Le nom est obligatoire.');
      return;
    }

    this.deptSubmitting.set(true);
    this.deptError.set(null);

    try {
      const editingId = this.editingDeptId();
      if (editingId) {
        await this.departementService.updateDepartement(editingId, { nom: form.nom });
      } else {
        await this.departementService.createDepartement({ nom: form.nom });
      }
      this.showDeptModal.set(false);
      await this.loadAll();
    } catch (err: any) {
      this.deptError.set(err?.error?.message ?? "Erreur lors de l'enregistrement.");
    } finally {
      this.deptSubmitting.set(false);
    }
  }

  async deleteDept(dept: Departement): Promise<void> {
  this.askConfirm(
    `Supprimer le département "${dept.nom}" ? Cette action est irréversible.`,
    () => this.doDeleteDept(dept),
  );
}

private async doDeleteDept(dept: Departement): Promise<void> {
  try {
    await this.departementService.deleteDepartement(dept.id);
    if (this.selectedDepartementId() === dept.id) {
      this.selectedDepartementId.set(null);
    }
    await this.loadAll();
  } catch (err: any) {
    this.error.set(
      err?.error?.message ??
        'Impossible de supprimer ce département (des catégories ou demandes y sont peut-être rattachées).',
    );
  }
}

  // --- CRUD Catégorie ---

  openCreateCat(): void {
    this.editingCatId.set(null);
    this.catForm.set({ nom: '', delaiReponse: '', delaiResolution: '' });
    this.catError.set(null);
    this.showCatModal.set(true);
  }

  openEditCat(cat: Categorie): void {
    this.editingCatId.set(cat.id);
    this.catForm.set({
      nom: cat.nom,
      delaiReponse: String(cat.delaiReponse),
      delaiResolution: String(cat.delaiResolution),
    });
    this.catError.set(null);
    this.showCatModal.set(true);
  }

  closeCatModal(): void {
    this.showCatModal.set(false);
  }

  updateCatField(field: keyof CategorieForm, value: string): void {
    this.catForm.update((f) => ({ ...f, [field]: value }));
  }

  async submitCat(): Promise<void> {
    const form = this.catForm();
    const deptId = this.selectedDepartementId();

    if (!deptId) {
      this.catError.set('Aucun département sélectionné.');
      return;
    }
    if (!form.nom.trim() || !form.delaiReponse || !form.delaiResolution) {
      this.catError.set('Tous les champs sont obligatoires.');
      return;
    }

    this.catSubmitting.set(true);
    this.catError.set(null);

    try {
      const payload = {
        nom: form.nom,
        departementId: deptId,
        delaiReponse: Number(form.delaiReponse),
        delaiResolution: Number(form.delaiResolution),
      };

      const editingId = this.editingCatId();
      if (editingId) {
        await this.departementService.updateCategorie(editingId, payload);
      } else {
        await this.departementService.createCategorie(payload);
      }
      this.showCatModal.set(false);
      await this.loadAll();
    } catch (err: any) {
      this.catError.set(err?.error?.message ?? "Erreur lors de l'enregistrement.");
    } finally {
      this.catSubmitting.set(false);
    }
  }

  async deleteCat(cat: Categorie): Promise<void> {
  this.askConfirm(
    `Supprimer la catégorie "${cat.nom}" ? Cette action est irréversible.`,
    () => this.doDeleteCat(cat),
  );
}

private async doDeleteCat(cat: Categorie): Promise<void> {
  try {
    await this.departementService.deleteCategorie(cat.id);
    await this.loadAll();
  } catch (err: any) {
    this.error.set(
      err?.error?.message ??
        'Impossible de supprimer cette catégorie (des demandes y sont peut-être rattachées).',
    );
  }
}
}