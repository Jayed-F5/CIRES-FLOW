import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { DashboardService, DashboardStats, DashboardPerformance, DashboardKpi } from '../../services/dashboard.service';
import { Header } from '../../shared/header/header';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [Header, CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  authService = inject(AuthService);
  private dashboardService = inject(DashboardService);

  loading = signal(true);
  error = signal<string | null>(null);

  stats = signal<DashboardStats | null>(null);
  performance = signal<DashboardPerformance | null>(null);
  kpi = signal<DashboardKpi | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const [stats, performance, kpi] = await Promise.all([
        this.dashboardService.getStats(),
        this.dashboardService.getPerformance(),
        this.dashboardService.getKpi(),
      ]);
      this.stats.set(stats);
      this.performance.set(performance);
      this.kpi.set(kpi);
    } catch (err) {
      this.error.set('Impossible de charger les données du tableau de bord');
    } finally {
      this.loading.set(false);
    }
  }
}