import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface DashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  statut?: string;
  categorieId?: number;
}

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

  private buildParams(filters?: DashboardFilters): HttpParams {
    let params = new HttpParams();
    if (filters?.dateFrom) params = params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params = params.set('dateTo', filters.dateTo);
    if (filters?.statut) params = params.set('statut', filters.statut);
    if (filters?.categorieId) params = params.set('categorieId', String(filters.categorieId));
    return params;
  }

  async getStats(filters?: DashboardFilters): Promise<DashboardStats> {
    return firstValueFrom(
      this.http.get<DashboardStats>(`${environment.apiUrl}/dashboard/stats`, {
        params: this.buildParams(filters),
      }),
    );
  }

  async getPerformance(filters?: DashboardFilters): Promise<DashboardPerformance> {
    return firstValueFrom(
      this.http.get<DashboardPerformance>(`${environment.apiUrl}/dashboard/performance`, {
        params: this.buildParams(filters),
      }),
    );
  }

  async getKpi(filters?: DashboardFilters): Promise<DashboardKpi> {
    return firstValueFrom(
      this.http.get<DashboardKpi>(`${environment.apiUrl}/dashboard/kpi`, {
        params: this.buildParams(filters),
      }),
    );
  }
}