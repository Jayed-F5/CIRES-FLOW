import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

export type Role = 'EMPLOYE' | 'AGENT' | 'MANAGER' | 'ADMIN';

export interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  actif: boolean;
  departementId: number | null;
  departement: { id: number; nom: string } | null;
}

export interface UpdateUserPayload {
  role?: string;
  departementId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private http = inject(HttpClient);

  async getUsers(): Promise<Utilisateur[]> {
    return firstValueFrom(
      this.http.get<Utilisateur[]>(`${environment.apiUrl}/auth/users`),
    );
  }

  async updateUser(id: number, payload: UpdateUserPayload): Promise<Utilisateur> {
    return firstValueFrom(
      this.http.patch<Utilisateur>(`${environment.apiUrl}/auth/users/${id}`, payload),
    );
  }

  async updateStatut(id: number, actif: boolean): Promise<Utilisateur> {
    return firstValueFrom(
      this.http.patch<Utilisateur>(`${environment.apiUrl}/auth/users/${id}/statut`, { actif }),
    );
  }
}