import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface Departement {
  id: number;
  nom: string;
}

export interface Categorie {
  id: number;
  nom: string;
  departementId: number;
  delaiReponse: number;
  delaiResolution: number;
}

export interface CreateDepartementPayload {
  nom: string;
}

export interface CreateCategoriePayload {
  nom: string;
  departementId: number;
  delaiReponse: number;
  delaiResolution: number;
}

@Injectable({
  providedIn: 'root',
})
export class DepartementService {
  private http = inject(HttpClient);

  async getDepartements(): Promise<Departement[]> {
    return firstValueFrom(
      this.http.get<Departement[]>(`${environment.apiUrl}/departement`),
    );
  }

  async createDepartement(payload: CreateDepartementPayload): Promise<Departement> {
    return firstValueFrom(
      this.http.post<Departement>(`${environment.apiUrl}/departement`, payload),
    );
  }

  async updateDepartement(id: number, payload: CreateDepartementPayload): Promise<Departement> {
    return firstValueFrom(
      this.http.patch<Departement>(`${environment.apiUrl}/departement/${id}`, payload),
    );
  }

  async deleteDepartement(id: number): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/departement/${id}`),
    );
  }

  async getCategories(departementId?: number): Promise<Categorie[]> {
  const params: Record<string, string> = {};
  if (departementId) {
    params['departementId'] = String(departementId);
  }

  return firstValueFrom(
    this.http.get<Categorie[]>(`${environment.apiUrl}/categorie`, { params }),
  );
}

  async createCategorie(payload: CreateCategoriePayload): Promise<Categorie> {
    return firstValueFrom(
      this.http.post<Categorie>(`${environment.apiUrl}/categorie`, payload),
    );
  }

  async updateCategorie(
    id: number,
    payload: Partial<CreateCategoriePayload>,
  ): Promise<Categorie> {
    return firstValueFrom(
      this.http.patch<Categorie>(`${environment.apiUrl}/categorie/${id}`, payload),
    );
  }

  async deleteCategorie(id: number): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/categorie/${id}`),
    );
  }
}