import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface StatutCount {
  statut: string;
  count: number;
}

export interface CategorieCount {
  categorieId: number;
  nom: string;
  count: number;
}

export interface DepartementCount {
  departementId: number;
  nom: string;
  count: number;
}

export interface DashboardStats {
  total: number;
  parStatut: StatutCount[];
  parCategorie: CategorieCount[];
  parDepartement: DepartementCount[];
}

export interface DashboardPerformance {
  tempsMoyenResolutionHeures: number | null;
  tempsMoyenReponseHeures: number | null;
  tauxRespectSLAPourcent: number | null;
  nombreDemandesClotureesAnalysees: number;
  nombreDemandesAvecReponseAnalysees: number;
}

export interface DashboardKpi {
  demandesActives: number;
  enAttenteApprobation: number;
  slaDepasses: number;
  slaRespectees: number;
  slaARisque: number;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);

  async getStats(): Promise<DashboardStats> {
    return firstValueFrom(
      this.http.get<DashboardStats>(`${environment.apiUrl}/dashboard/stats`),
    );
  }

  async getPerformance(): Promise<DashboardPerformance> {
    return firstValueFrom(
      this.http.get<DashboardPerformance>(`${environment.apiUrl}/dashboard/performance`),
    );
  }

  async getKpi(): Promise<DashboardKpi> {
    return firstValueFrom(
      this.http.get<DashboardKpi>(`${environment.apiUrl}/dashboard/kpi`),
    );
  }
}