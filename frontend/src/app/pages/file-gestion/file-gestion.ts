import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DemandeService, Demande } from '../../services/demande.service';
import { AuthService } from '../../services/auth.service';
import { Header } from '../../shared/header/header';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

interface Categorie {
  id: number;
  nom: string;
  departementId: number;
}

interface Departement {
  id: number;
  nom: string;
}

// Statuses considered "still open / needs attention".
const OPEN_STATUTS = ['NOUVEAU', 'EN_ATTENTE_APPROBATION', 'EN_COURS'];

// Priority weight for sorting urgency within the queue.
const SLA_WEIGHT: Record<string, number> = {
  DEPASSE: 0,
  A_RISQUE: 1,
  RESPECTE: 2,
  NON_APPLICABLE: 3,
};

@Component({
  selector: 'app-file-gestion',
  standalone: true,
  imports: [Header, CommonModule, RouterLink],
  templateUrl: './file-gestion.html',
  styleUrl: './file-gestion.css',
})
export class FileGestion implements OnInit {
  private demandeService = inject(DemandeService);
  private http = inject(HttpClient);
  authService = inject(AuthService);

  loading = signal(true);
  error = signal<string | null>(null);

  allOpenDemandes = signal<Demande[]>([]);
  departements = signal<Departement[]>([]);
  allCategories = signal<Categorie[]>([]);

  selectedStatut = signal('');
  selectedDepartementId = signal('');

  isAdmin = computed(() => this.authService.user()?.role === 'ADMIN');

  readonly statutOptions = [
    { value: '', label: 'Tous les Statuts Ouverts' },
    { value: 'NOUVEAU', label: 'Nouveau' },
    { value: 'EN_ATTENTE_APPROBATION', label: "En attente d'approbation" },
    { value: 'EN_COURS', label: 'En cours' },
  ];

  readonly statutLabels: Record<string, string> = {
    NOUVEAU: 'NOUVEAU',
    EN_ATTENTE_APPROBATION: 'EN COURS',
    EN_COURS: 'EN COURS',
    RESOLU: 'RESOLU',
    CLOTURE: 'RESOLU',
    REJETE: 'REJETE',
    ANNULE: 'ANNULE',
  };

  readonly slaLabels: Record<string, string> = {
    RESPECTE: 'Respecté',
    A_RISQUE: 'À risque',
    DEPASSE: 'Dépassé',
    NON_APPLICABLE: '—',
  };

  // Filtered + sorted view: most urgent (SLA dépassé/à risque) first.
  queue = computed(() => {
    let items = this.allOpenDemandes();

    if (this.selectedStatut()) {
      items = items.filter((d) => d.statut === this.selectedStatut());
    }

    if (this.isAdmin() && this.selectedDepartementId()) {
      items = items.filter((d) => d.departementId === Number(this.selectedDepartementId()));
    }

    return [...items].sort((a, b) => {
      const weightA = SLA_WEIGHT[a.indicateurSLA] ?? 4;
      const weightB = SLA_WEIGHT[b.indicateurSLA] ?? 4;
      if (weightA !== weightB) return weightA - weightB;
      return new Date(a.dateCreation).getTime() - new Date(b.dateCreation).getTime();
    });
  });

  urgentCount = computed(
    () => this.allOpenDemandes().filter((d) => d.indicateurSLA === 'DEPASSE' || d.indicateurSLA === 'A_RISQUE').length,
  );

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadDepartements(), this.loadAllCategories()]);
    await this.loadQueue();
  }

  async loadDepartements(): Promise<void> {
    try {
      const depts = await firstValueFrom(
        this.http.get<Departement[]>(`${environment.apiUrl}/departement`),
      );
      this.departements.set(depts);
    } catch {
      // non-blocking
    }
  }

  async loadAllCategories(): Promise<void> {
    try {
      const cats = await firstValueFrom(
        this.http.get<Categorie[]>(`${environment.apiUrl}/categorie`),
      );
      this.allCategories.set(cats);
    } catch {
      // non-blocking
    }
  }

  categorieName(categorieId: number): string {
    return this.allCategories().find((c) => c.id === categorieId)?.nom ?? `Catégorie ${categorieId}`;
  }

  departementName(departementId: number): string {
    return this.departements().find((d) => d.id === departementId)?.nom ?? `Dépt ${departementId}`;
  }

  async loadQueue(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      // Pull a large page of open-ish demandes; backend still scopes by role.
      // We fetch all 3 open statuses in parallel and merge, since the
      // existing endpoint only accepts a single statut filter at a time.
      const results = await Promise.all(
        OPEN_STATUTS.map((statut) => this.demandeService.getDemandes(1, 100, { statut })),
      );
      const merged = results.flatMap((r) => r.data);
      this.allOpenDemandes.set(merged);
    } catch (err) {
      this.error.set('Impossible de charger la file de gestion');
    } finally {
      this.loading.set(false);
    }
  }

  onStatutChange(value: string): void {
    this.selectedStatut.set(value);
  }

  onDepartementChange(value: string): void {
    this.selectedDepartementId.set(value);
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR');
  }

  get greetingName(): string {
    const role = this.authService.user()?.role;
    const labels: Record<string, string> = {
      EMPLOYE: 'Employé',
      AGENT: 'Agent',
      MANAGER: 'Manager',
      ADMIN: 'Admin',
    };
    return role ? (labels[role] ?? 'Utilisateur') : 'Utilisateur';
  }
}