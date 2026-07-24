import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Header } from '../../shared/header/header';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

interface Departement {
  id: number;
  nom: string;
}

interface Categorie {
  id: number;
  nom: string;
  departementId: number;
}

@Component({
  selector: 'app-creer-demande',
  standalone: true,
  imports: [Header, CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './creer-demande.html',
  styleUrl: './creer-demande.css',
})
export class CreerDemande implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);

  departements = signal<Departement[]>([]);
  allCategories = signal<Categorie[]>([]);
  selectedFile = signal<File | null>(null);
  isDragging = signal(false);
  selectedDepartementId = signal('');

  submitting = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  readonly prioriteOptions = [
    { value: 'BASSE', label: 'Basse' },
    { value: 'NORMALE', label: 'Normale' },
    { value: 'HAUTE', label: 'Haute' },
    { value: 'URGENTE', label: 'Urgente' },
  ];

  form = this.fb.group({
    titre: ['', [Validators.required, Validators.minLength(3)]],
    departementId: ['', [Validators.required]],
    categorieId: ['', [Validators.required]],
    priorite: ['NORMALE', [Validators.required]],
    description: ['', [Validators.required, Validators.minLength(10)]],
  });

  filteredCategories = computed(() => {
    const deptId = this.selectedDepartementId();
    if (!deptId) return [];
    return this.allCategories().filter((c) => c.departementId === Number(deptId));
  });

  async ngOnInit(): Promise<void> {
  const [depts, cats] = await Promise.all([
    firstValueFrom(this.http.get<Departement[]>(`${environment.apiUrl}/departement`)),
    firstValueFrom(this.http.get<Categorie[]>(`${environment.apiUrl}/categorie`)),
  ]);
  this.departements.set(depts);
  this.allCategories.set(cats);
  this.form.get('categorieId')?.disable();
}

  onDepartementChange(value: string): void {
  this.selectedDepartementId.set(value);
  this.form.get('departementId')?.setValue(value);
  this.form.get('categorieId')?.setValue('');

  const categorieControl = this.form.get('categorieId');
  if (value) {
    categorieControl?.enable();
  } else {
    categorieControl?.disable();
  }
}

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    this.selectedFile.set(input.files[0]);
  }
}

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.selectedFile.set(file);
    }
  }

  removeFile(): void {
    this.selectedFile.set(null);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    try {
      const raw = this.form.getRawValue();
      const payload = {
        titre: raw.titre,
        description: raw.description,
        priorite: raw.priorite,
        departementId: Number(raw.departementId),
        categorieId: Number(raw.categorieId),
      };

      const created = await firstValueFrom(
        this.http.post<{ id: number }>(`${environment.apiUrl}/demande`, payload),
      );

      if (this.selectedFile()) {
        const formData = new FormData();
        formData.append('file', this.selectedFile()!);
        await firstValueFrom(
          this.http.post(`${environment.apiUrl}/demande/${created.id}/pieces-jointes`, formData),
        );
      }

      this.successMessage.set('Demande créée avec succès !');
      setTimeout(() => {
        this.router.navigate(['/mes-demandes']);
      }, 1200);
    } catch (err: any) {
      this.error.set(err?.error?.message ?? "Erreur lors de la création de la demande");
    } finally {
      this.submitting.set(false);
    }
  }
}