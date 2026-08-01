import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DashboardService, DashboardStats, DashboardPerformance, DashboardKpi } from '../../services/dashboard.service';
import { Header } from '../../shared/header/header';
import { BarChart, BarChartDatum } from '../../shared/bar-chart/bar-chart';
import { DonutChart } from '../../shared/donut-chart/donut-chart';
import { LucideLayers, LucideClock, LucideTriangleAlert, LucideTimer } from '@lucide/angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [Header, CommonModule, RouterLink, BarChart, DonutChart, LucideLayers, LucideClock, LucideTriangleAlert, LucideTimer],
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

  barChartData = computed<BarChartDatum[]>(() => {
    const s = this.stats();
    if (!s) return [];
    return s.parStatut.map((item) => ({ label: item.statut, value: item.count }));
  });

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

  private fileBaseName(): string {
    return `tableau-de-bord-${new Date().toISOString().slice(0, 10)}`;
  }

  async exportExcel(): Promise<void> {
    const stats = this.stats();
    const performance = this.performance();
    const kpi = this.kpi();
    if (!stats || !performance || !kpi) return;

    const XLSX = await import('xlsx');

    const kpiSheet = XLSX.utils.json_to_sheet([
      { Indicateur: 'Demandes actives', Valeur: kpi.demandesActives },
      { Indicateur: "En attente d'approbation", Valeur: kpi.enAttenteApprobation },
      { Indicateur: 'SLA dépassés', Valeur: kpi.slaDepasses },
      { Indicateur: 'SLA respectées', Valeur: kpi.slaRespectees },
      { Indicateur: 'SLA à risque', Valeur: kpi.slaARisque },
      {
        Indicateur: 'Temps moyen de résolution (jours)',
        Valeur: performance.tempsMoyenResolutionHeures !== null
          ? Math.round((performance.tempsMoyenResolutionHeures / 24) * 10) / 10
          : '—',
      },
      {
        Indicateur: 'Temps moyen de réponse (heures)',
        Valeur: performance.tempsMoyenReponseHeures ?? '—',
      },
      {
        Indicateur: 'Taux de respect SLA (%)',
        Valeur: performance.tauxRespectSLAPourcent ?? '—',
      },
    ]);

    const statutSheet = XLSX.utils.json_to_sheet(
      stats.parStatut.map((s) => ({ Statut: s.statut, Nombre: s.count })),
    );
    const categorieSheet = XLSX.utils.json_to_sheet(
      stats.parCategorie.map((c) => ({ Catégorie: c.nom, Nombre: c.count })),
    );
    const departementSheet = XLSX.utils.json_to_sheet(
      stats.parDepartement.map((d) => ({ Département: d.nom, Nombre: d.count })),
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, kpiSheet, 'Indicateurs');
    XLSX.utils.book_append_sheet(workbook, statutSheet, 'Par statut');
    XLSX.utils.book_append_sheet(workbook, categorieSheet, 'Par catégorie');
    XLSX.utils.book_append_sheet(workbook, departementSheet, 'Par département');

    XLSX.writeFile(workbook, `${this.fileBaseName()}.xlsx`);
  }

  async exportPdf(): Promise<void> {
    const stats = this.stats();
    const performance = this.performance();
    const kpi = this.kpi();
    if (!stats || !performance || !kpi) return;

    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Tableau de Bord Analytique', 14, 16);
    doc.setFontSize(10);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [['Indicateur', 'Valeur']],
      body: [
        ['Demandes actives', String(kpi.demandesActives)],
        ["En attente d'approbation", String(kpi.enAttenteApprobation)],
        ['SLA dépassés', String(kpi.slaDepasses)],
        ['SLA respectées', String(kpi.slaRespectees)],
        ['SLA à risque', String(kpi.slaARisque)],
        [
          'Temps moyen de résolution (jours)',
          performance.tempsMoyenResolutionHeures !== null
            ? `${Math.round((performance.tempsMoyenResolutionHeures / 24) * 10) / 10}`
            : '—',
        ],
        ['Taux de respect SLA (%)', performance.tauxRespectSLAPourcent !== null ? String(performance.tauxRespectSLAPourcent) : '—'],
      ],
    });

    const afterKpiY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    autoTable(doc, {
      startY: afterKpiY,
      head: [['Statut', 'Nombre']],
      body: stats.parStatut.map((s) => [s.statut, String(s.count)]),
    });

    const afterStatutY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    autoTable(doc, {
      startY: afterStatutY,
      head: [['Département', 'Nombre']],
      body: stats.parDepartement.map((d) => [d.nom, String(d.count)]),
    });

    doc.save(`${this.fileBaseName()}.pdf`);
  }
}