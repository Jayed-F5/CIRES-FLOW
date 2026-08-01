import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

export type StatutDemande =
  | 'NOUVEAU'
  | 'EN_ATTENTE_APPROBATION'
  | 'EN_COURS'
  | 'RESOLU'
  | 'CLOTURE'
  | 'REJETE'
  | 'ANNULE';

export type Priorite = 'BASSE' | 'NORMALE' | 'HAUTE' | 'URGENTE';

export type IndicateurSLA = 'RESPECTE' | 'A_RISQUE' | 'DEPASSE' | 'NON_APPLICABLE';

export interface Demande {
  id: number;
  titre: string;
  description: string;
  priorite: Priorite;
  statut: StatutDemande;
  departementId: number;
  categorieId: number;
  demandeurId: number;
  agentId: number | null;
  dateCreation: string;
  dateCloture: string | null;
  dateLimiteSLA: string | null;
  dateLimiteReponse: string | null;
  dateReponse: string | null;
  metadata: unknown;
  indicateurSLA: IndicateurSLA;
}

export interface DemandeDetail extends Demande {
  demandeur: { id: number; nom: string; prenom: string; email: string };
  agent: { id: number; nom: string; prenom: string; email: string } | null;
}

export interface DemandeListResponse {
  data: Demande[];
  total: number;
  page: number;
  totalPages: number;
}

// Libellés compacts pour les vues liste (mes-demandes, file-gestion), qui
// regroupent certains statuts pour un affichage plus simple en un coup d'œil.
export const STATUT_LABELS: Record<string, string> = {
  NOUVEAU: 'NOUVEAU',
  EN_ATTENTE_APPROBATION: 'EN COURS',
  EN_COURS: 'EN COURS',
  RESOLU: 'RESOLU',
  CLOTURE: 'RESOLU',
  REJETE: 'REJETE',
  ANNULE: 'ANNULE',
};

export const SLA_LABELS: Record<string, string> = {
  RESPECTE: 'Respecté',
  A_RISQUE: 'À risque',
  DEPASSE: 'Dépassé',
  NON_APPLICABLE: '—',
};

// Libellés détaillés pour la vue détail d'une demande, qui garde chaque
// statut distinct au lieu de les regrouper.
export const STATUT_LABELS_DETAIL: Record<string, string> = {
  NOUVEAU: 'NOUVEAU',
  EN_ATTENTE_APPROBATION: "EN ATTENTE D'APPROBATION",
  EN_COURS: 'EN COURS',
  RESOLU: 'RESOLU',
  CLOTURE: 'CLOTURE',
  REJETE: 'REJETE',
  ANNULE: 'ANNULE',
};

export const SLA_LABELS_DETAIL: Record<string, string> = {
  RESPECTE: 'Respecté',
  A_RISQUE: 'À risque',
  DEPASSE: 'Dépassé',
  NON_APPLICABLE: 'Non applicable',
};

@Injectable({
  providedIn: 'root',
})
export class DemandeService {
  private http = inject(HttpClient);

  async getDemandes(
  page = 1,
  limit = 10,
  filters?: { search?: string; statut?: string; departementId?: number; categorieId?: number },
): Promise<DemandeListResponse> {
  const params: Record<string, string | number> = { page, limit };
  if (filters?.search) params['search'] = filters.search;
  if (filters?.statut) params['statut'] = filters.statut;
  if (filters?.departementId) params['departementId'] = filters.departementId;
  if (filters?.categorieId) params['categorieId'] = filters.categorieId;

  return firstValueFrom(
    this.http.get<DemandeListResponse>(`${environment.apiUrl}/demande`, { params }),
  );
}
  async getById(id: number): Promise<DemandeDetail> {
    return firstValueFrom(
      this.http.get<DemandeDetail>(`${environment.apiUrl}/demande/${id}`),
    );
  }

  async updateStatut(id: number, statut: StatutDemande): Promise<Demande> {
    return firstValueFrom(
      this.http.put<Demande>(`${environment.apiUrl}/demande/${id}/statut`, { statut }),
    );
  }
}