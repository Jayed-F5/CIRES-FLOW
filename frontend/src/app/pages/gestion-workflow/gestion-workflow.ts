import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Header } from '../../shared/header/header';
import { DepartementService, Departement, Categorie } from '../../services/departement.service';
import { WorkflowService, WorkflowEtape, Role } from '../../services/workflow.service';

interface EtapeForm {
  ordre: string;
  roleApprobateur: Role;
}

@Component({
  selector: 'app-gestion-workflow',
  standalone: true,
  imports: [Header, CommonModule],
  templateUrl: './gestion-workflow.html',
  styleUrl: './gestion-workflow.css',
})
export class GestionWorkflow implements OnInit {
  private departementService = inject(DepartementService);
  private workflowService = inject(WorkflowService);

  departements = signal<Departement[]>([]);
  allCategories = signal<Categorie[]>([]);
  etapes = signal<WorkflowEtape[]>([]);

  selectedDepartementId = signal<number | null>(null);
  selectedCategorieId = signal<number | null>(null);

  loading = signal(true);
  etapesLoading = signal(false);
  error = signal<string | null>(null);

  readonly roleOptions: Role[] = ['EMPLOYE', 'AGENT', 'MANAGER', 'ADMIN'];

  readonly roleLabels: Record<Role, string> = {
    EMPLOYE: 'Employé',
    AGENT: 'Agent',
    MANAGER: 'Manager',
    ADMIN: 'Administrateur',
  };

  categoriesForSelected = computed(() => {
    const deptId = this.selectedDepartementId();
    if (!deptId) return [];
    return this.allCategories().filter((c) => c.departementId === deptId);
  });

  selectedCategorie = computed(() =>
    this.categoriesForSelected().find((c) => c.id === this.selectedCategorieId()) ?? null,
  );

  etapesTriees = computed(() =>
    [...this.etapes()].sort((a, b) => a.ordre - b.ordre),
  );

  // --- Modale étape ---
  showEtapeModal = signal(false);
  editingEtapeId = signal<number | null>(null);
  etapeForm = signal<EtapeForm>({ ordre: '', roleApprobateur: 'MANAGER' });
  etapeSubmitting = signal(false);
  etapeError = signal<string | null>(null);
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
    this.loading.set(true);
    this.error.set(null);
    try {
      const [depts, cats] = await Promise.all([
        this.departementService.getDepartements(),
        this.departementService.getCategories(),
      ]);
      this.departements.set(depts);
      this.allCategories.set(cats);
      if (depts.length > 0) {
        this.selectedDepartementId.set(depts[0].id);
      }
    } catch {
      this.error.set('Erreur lors du chargement.');
    } finally {
      this.loading.set(false);
    }
  }

  async selectDepartement(id: number): Promise<void> {
    this.selectedDepartementId.set(id);
    this.selectedCategorieId.set(null);
    this.etapes.set([]);

    const firstCat = this.categoriesForSelected()[0];
    if (firstCat) {
      await this.selectCategorie(firstCat.id);
    }
  }

  async selectCategorie(id: number): Promise<void> {
    this.selectedCategorieId.set(id);
    await this.loadEtapes(id);
  }

  async loadEtapes(categorieId: number): Promise<void> {
    this.etapesLoading.set(true);
    this.error.set(null);
    try {
      const data = await this.workflowService.getEtapesByCategorie(categorieId);
      this.etapes.set(data);
    } catch {
      this.error.set('Erreur lors du chargement des étapes.');
    } finally {
      this.etapesLoading.set(false);
    }
  }

  // --- CRUD étape ---

  openCreateEtape(): void {
    const nextOrdre = this.etapesTriees().length
      ? Math.max(...this.etapesTriees().map((e) => e.ordre)) + 1
      : 1;
    this.editingEtapeId.set(null);
    this.etapeForm.set({ ordre: String(nextOrdre), roleApprobateur: 'MANAGER' });
    this.etapeError.set(null);
    this.showEtapeModal.set(true);
  }

  openEditEtape(etape: WorkflowEtape): void {
    this.editingEtapeId.set(etape.id);
    this.etapeForm.set({
      ordre: String(etape.ordre),
      roleApprobateur: etape.roleApprobateur,
    });
    this.etapeError.set(null);
    this.showEtapeModal.set(true);
  }

  closeEtapeModal(): void {
    this.showEtapeModal.set(false);
  }

  updateEtapeField(field: keyof EtapeForm, value: string): void {
    this.etapeForm.update((f) => ({ ...f, [field]: value }));
  }

  async submitEtape(): Promise<void> {
    const categorieId = this.selectedCategorieId();
    const form = this.etapeForm();

    if (!categorieId) {
      this.etapeError.set('Aucune catégorie sélectionnée.');
      return;
    }
    if (!form.ordre || Number(form.ordre) < 1) {
      this.etapeError.set("L'ordre doit être un nombre positif.");
      return;
    }

    this.etapeSubmitting.set(true);
    this.etapeError.set(null);

    try {
      const editingId = this.editingEtapeId();
      if (editingId) {
        await this.workflowService.updateEtape(editingId, {
          ordre: Number(form.ordre),
          roleApprobateur: form.roleApprobateur,
        });
      } else {
        await this.workflowService.createEtape({
          categorieId,
          ordre: Number(form.ordre),
          roleApprobateur: form.roleApprobateur,
        });
      }
      this.showEtapeModal.set(false);
      await this.loadEtapes(categorieId);
    } catch (err: any) {
      this.etapeError.set(err?.error?.message ?? "Erreur lors de l'enregistrement.");
    } finally {
      this.etapeSubmitting.set(false);
    }
  }

  async deleteEtape(etape: WorkflowEtape): Promise<void> {
  this.askConfirm(
    `Supprimer l'étape ${etape.ordre} (${this.roleLabels[etape.roleApprobateur]}) ?`,
    () => this.doDeleteEtape(etape),
  );
}

private async doDeleteEtape(etape: WorkflowEtape): Promise<void> {
  const categorieId = this.selectedCategorieId();
  try {
    await this.workflowService.deleteEtape(etape.id);
    if (categorieId) {
      await this.loadEtapes(categorieId);
    }
  } catch (err: any) {
    this.error.set(
      err?.error?.message ??
        'Impossible de supprimer cette étape (des approbations y sont peut-être rattachées).',
    );
  }
}
}