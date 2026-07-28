import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

export type Role = 'EMPLOYE' | 'AGENT' | 'MANAGER' | 'ADMIN';

export interface WorkflowEtape {
  id: number;
  categorieId: number;
  ordre: number;
  roleApprobateur: Role;
}

export interface EtapePayload {
  categorieId?: number;
  ordre: number;
  roleApprobateur: Role;
}

@Injectable({
  providedIn: 'root',
})
export class WorkflowService {
  private http = inject(HttpClient);

  async getEtapesByCategorie(categorieId: number): Promise<WorkflowEtape[]> {
    return firstValueFrom(
      this.http.get<WorkflowEtape[]>(
        `${environment.apiUrl}/workflow/etapes/categorie/${categorieId}`,
      ),
    );
  }

  async createEtape(payload: {
    categorieId: number;
    ordre: number;
    roleApprobateur: Role;
  }): Promise<WorkflowEtape> {
    return firstValueFrom(
      this.http.post<WorkflowEtape>(`${environment.apiUrl}/workflow/etapes`, payload),
    );
  }

  async updateEtape(
    id: number,
    payload: { ordre?: number; roleApprobateur?: Role },
  ): Promise<WorkflowEtape> {
    return firstValueFrom(
      this.http.patch<WorkflowEtape>(`${environment.apiUrl}/workflow/etapes/${id}`, payload),
    );
  }

  async deleteEtape(id: number): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/workflow/etapes/${id}`),
    );
  }
}