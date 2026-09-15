import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, debounceTime } from 'rxjs';
import {
  DemandeService,
  Demande,
  STATUT_LABELS_DETAIL,
  SLA_LABELS,
} from '../../services/demande.service';
import { DepartementService, Departement, Categorie } from '../../services/departement.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { Header } from '../../shared/header/header';

// Statuts considérés comme "encore ouverts / nécessitant une action".
const OPEN_STATUTS = ['NOUVEAU', 'EN_ATTENTE_APPROBATION', 'EN_COURS'];

// Poids de priorité pour trier l'urgence dans la file.
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
export class FileGestion implements OnInit, OnDestroy {
  private demandeService = inject(DemandeService);
  private departementService = inject(DepartementService);
  private notificationService = inject(NotificationService);
  authService = inject(AuthService);

  private newNotificationSub?: Subscription;

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

  readonly statutLabels = STATUT_LABELS_DETAIL;
  readonly slaLabels = SLA_LABELS;

  // Vue filtrée et triée : les plus urgentes (SLA dépassé/à risque) en premier.
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
    () =>
      this.allOpenDemandes().filter(
        (d) => d.indicateurSLA === 'DEPASSE' || d.indicateurSLA === 'A_RISQUE',
      ).length,
  );

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadDepartements(), this.loadAllCategories()]);
    await this.loadQueue();

    // Une nouvelle demande, une approbation ou un changement de statut ailleurs
    // se traduit par une notification : on en profite pour rafraîchir la file
    // sans attendre que l'utilisateur recharge la page. Le debounce absorbe les
    // rafales de notifications liées à un même événement.
    this.newNotificationSub = this.notificationService.newNotification$
      .pipe(debounceTime(800))
      .subscribe(() => this.loadQueue());
  }

  ngOnDestroy(): void {
    this.newNotificationSub?.unsubscribe();
  }

  async loadDepartements(): Promise<void> {
    try {
      const depts = await this.departementService.getDepartements();
      this.departements.set(depts);
    } catch {
      // non bloquant
    }
  }

  async loadAllCategories(): Promise<void> {
    try {
      const cats = await this.departementService.getCategories();
      this.allCategories.set(cats);
    } catch {
      // non bloquant
    }
  }

  categorieName(categorieId: number): string {
    return (
      this.allCategories().find((c) => c.id === categorieId)?.nom ?? `Catégorie ${categorieId}`
    );
  }

  departementName(departementId: number): string {
    return this.departements().find((d) => d.id === departementId)?.nom ?? `Dépt ${departementId}`;
  }

  async loadQueue(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      // Le backend filtre déjà par rôle. On récupère les 3 statuts ouverts en
      // parallèle (l'endpoint n'accepte qu'un seul statut à la fois), en
      // paginant chacun jusqu'au bout pour ne pas perdre les demandes
      // au-delà de la première page.
      const results = await Promise.all(
        OPEN_STATUTS.map((statut) => this.fetchAllForStatut(statut)),
      );
      this.allOpenDemandes.set(results.flat());
    } catch (err) {
      this.error.set('Impossible de charger la file de gestion');
    } finally {
      this.loading.set(false);
    }
  }

  private async fetchAllForStatut(statut: string): Promise<Demande[]> {
    const pageSize = 100;
    const first = await this.demandeService.getDemandes(1, pageSize, { statut });
    const all = [...first.data];
    for (let page = 2; page <= first.totalPages; page++) {
      const next = await this.demandeService.getDemandes(page, pageSize, { statut });
      all.push(...next.data);
    }
    return all;
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