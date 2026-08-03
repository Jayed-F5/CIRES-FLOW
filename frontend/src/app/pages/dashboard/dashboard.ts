import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { DashboardService, DashboardStats, DashboardPerformance, DashboardKpi, DashboardFilters } from '../../services/dashboard.service';
import { DepartementService, Categorie } from '../../services/departement.service';
import { STATUT_LABELS_DETAIL } from '../../services/demande.service';
import { Header } from '../../shared/header/header';
import { BarChart, BarChartDatum } from '../../shared/bar-chart/bar-chart';
import { DonutChart } from '../../shared/donut-chart/donut-chart';
import { LucideLayers, LucideClock, LucideTriangleAlert, LucideTimer } from '@lucide/angular';
import { PDF_COLORS, PDF_TABLE_THEME, drawPdfHeaderBand, drawPdfSectionTitle, ensurePdfSpace, stampPdfFooter } from '../../shared/pdf-branding';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [Header, CommonModule, RouterLink, FormsModule, BarChart, DonutChart, LucideLayers, LucideClock, LucideTriangleAlert, LucideTimer],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private departementService = inject(DepartementService);

  loading = signal(true);
  refreshing = signal(false);
  error = signal<string | null>(null);

  stats = signal<DashboardStats | null>(null);
  performance = signal<DashboardPerformance | null>(null);
  kpi = signal<DashboardKpi | null>(null);
  categories = signal<Categorie[]>([]);

  readonly statutOptions = Object.entries(STATUT_LABELS_DETAIL);

  filterDateFrom = signal('');
  filterDateTo = signal('');
  filterStatut = signal('');
  filterCategorieId = signal<number | null>(null);

  barChartData = computed<BarChartDatum[]>(() => {
    const s = this.stats();
    if (!s) return [];
    return s.parStatut.map((item) => ({ label: item.statut, value: item.count }));
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadCategories(), this.loadData()]);
    this.loading.set(false);
  }

  private currentFilters(): DashboardFilters {
    return {
      dateFrom: this.filterDateFrom() || undefined,
      dateTo: this.filterDateTo() || undefined,
      statut: this.filterStatut() || undefined,
      categorieId: this.filterCategorieId() ?? undefined,
    };
  }

  // Formate la période actuellement filtrée pour l'affichage (ex-export PDF).
  private filterPeriodLabel(): string {
    const from = this.filterDateFrom();
    const to = this.filterDateTo();
    const fmt = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR');

    if (from && to) return `du ${fmt(from)} au ${fmt(to)}`;
    if (from) return `à partir du ${fmt(from)}`;
    if (to) return `jusqu'au ${fmt(to)}`;
    return 'toutes les données';
  }

  private async loadCategories(): Promise<void> {
    try {
      const user = this.authService.user();
      const departementId = user?.role === 'ADMIN' ? undefined : (user?.departementId ?? undefined);
      this.categories.set(await this.departementService.getCategories(departementId));
    } catch {
      // non bloquant : le filtre catégorie reste simplement vide
    }
  }

  private async loadData(): Promise<void> {
    try {
      const filters = this.currentFilters();
      const [stats, performance, kpi] = await Promise.all([
        this.dashboardService.getStats(filters),
        this.dashboardService.getPerformance(filters),
        this.dashboardService.getKpi(filters),
      ]);
      this.stats.set(stats);
      this.performance.set(performance);
      this.kpi.set(kpi);
      this.error.set(null);
    } catch (err) {
      this.error.set('Impossible de charger les données du tableau de bord');
    }
  }

  async applyFilters(): Promise<void> {
    this.refreshing.set(true);
    await this.loadData();
    this.refreshing.set(false);
  }

  async resetFilters(): Promise<void> {
    this.filterDateFrom.set('');
    this.filterDateTo.set('');
    this.filterStatut.set('');
    this.filterCategorieId.set(null);
    await this.applyFilters();
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

    const doc = new jsPDF() as any;
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 16;
    const contentWidth = pageWidth - marginX * 2;
    const tableMargin = { top: 20, left: marginX, right: marginX };

    let y = drawPdfHeaderBand(
      doc,
      marginX,
      'RAPPORT ANALYTIQUE',
      `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(...PDF_COLORS.navy);
    doc.text('Tableau de Bord Analytique', marginX, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text("Vue d'ensemble des indicateurs de performance", marginX, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_COLORS.navy);
    doc.text(`Période : ${this.filterPeriodLabel()}`, marginX, y);
    y += 10;

    // --- Tuiles KPI ---
    const tempsResolutionLabel =
      performance.tempsMoyenResolutionHeures !== null
        ? `${Math.round((performance.tempsMoyenResolutionHeures / 24) * 10) / 10} j`
        : '—';
    const tiles: { label: string; value: string; danger?: boolean }[] = [
      { label: 'DEMANDES ACTIVES', value: String(kpi.demandesActives) },
      { label: "EN ATTENTE D'APPROBATION", value: String(kpi.enAttenteApprobation) },
      { label: 'SLA DÉPASSÉS', value: String(kpi.slaDepasses), danger: true },
      { label: 'TEMPS MOYEN DE RÉSOLUTION', value: tempsResolutionLabel },
    ];

    const gap = 6;
    const tileWidth = (contentWidth - gap * (tiles.length - 1)) / tiles.length;
    const tileHeight = 24;
    tiles.forEach((tile, i) => {
      const tileX = marginX + i * (tileWidth + gap);
      doc.setFillColor(...PDF_COLORS.bg);
      doc.setDrawColor(...PDF_COLORS.border);
      doc.roundedRect(tileX, y, tileWidth, tileHeight, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...PDF_COLORS.muted);
      doc.text(doc.splitTextToSize(tile.label, tileWidth - 8), tileX + 4, y + 7);
      doc.setFontSize(15);
      doc.setTextColor(...(tile.danger ? ([231, 76, 60] as [number, number, number]) : PDF_COLORS.navy));
      doc.text(tile.value, tileX + 4, y + 19);
    });
    y += tileHeight + 14;

    // --- Indicateurs de performance ---
    y = ensurePdfSpace(doc, y, 30);
    y = drawPdfSectionTitle(doc, 'INDICATEURS DE PERFORMANCE', marginX, y);
    autoTable(doc, {
      ...PDF_TABLE_THEME,
      startY: y,
      margin: tableMargin,
      head: [['Indicateur', 'Valeur']],
      body: [
        [
          'Temps moyen de résolution',
          performance.tempsMoyenResolutionHeures !== null
            ? `${Math.round((performance.tempsMoyenResolutionHeures / 24) * 10) / 10} jours`
            : '—',
        ],
        [
          'Temps moyen de réponse',
          performance.tempsMoyenReponseHeures !== null ? `${performance.tempsMoyenReponseHeures} heures` : '—',
        ],
        [
          'Taux de respect SLA',
          performance.tauxRespectSLAPourcent !== null ? `${performance.tauxRespectSLAPourcent} %` : '—',
        ],
        ['SLA à risque', String(kpi.slaARisque)],
        ['SLA respectées', String(kpi.slaRespectees)],
      ],
    });
    y = doc.lastAutoTable.finalY + 14;

    // --- Répartition par statut ---
    y = ensurePdfSpace(doc, y, 30);
    y = drawPdfSectionTitle(doc, 'RÉPARTITION PAR STATUT', marginX, y);
    autoTable(doc, {
      ...PDF_TABLE_THEME,
      startY: y,
      margin: tableMargin,
      head: [['Statut', 'Nombre']],
      body: stats.parStatut.map((s) => [s.statut, String(s.count)]),
    });
    y = doc.lastAutoTable.finalY + 14;

    // --- Répartition par catégorie ---
    y = ensurePdfSpace(doc, y, 30);
    y = drawPdfSectionTitle(doc, 'RÉPARTITION PAR CATÉGORIE', marginX, y);
    autoTable(doc, {
      ...PDF_TABLE_THEME,
      startY: y,
      margin: tableMargin,
      head: [['Catégorie', 'Nombre']],
      body: stats.parCategorie.map((c) => [c.nom, String(c.count)]),
    });
    y = doc.lastAutoTable.finalY + 14;

    // --- Répartition par département ---
    y = ensurePdfSpace(doc, y, 30);
    y = drawPdfSectionTitle(doc, 'RÉPARTITION PAR DÉPARTEMENT', marginX, y);
    autoTable(doc, {
      ...PDF_TABLE_THEME,
      startY: y,
      margin: tableMargin,
      head: [['Département', 'Nombre']],
      body: stats.parDepartement.map((d) => [d.nom, String(d.count)]),
    });

    stampPdfFooter(doc, marginX);
    doc.save(`${this.fileBaseName()}.pdf`);
  }
}