import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  DemandeService,
  DemandeDetail,
  StatutDemande,
  IndicateurSLA,
  STATUT_LABELS_DETAIL,
  SLA_LABELS_DETAIL,
} from '../../services/demande.service';
import { DepartementService } from '../../services/departement.service';
import { AuthService } from '../../services/auth.service';
import { Header } from '../../shared/header/header';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { PDF_COLORS, drawPdfHeaderBand, drawPdfSectionTitle, ensurePdfSpace, stampPdfFooter } from '../../shared/pdf-branding';

interface Commentaire {
  id: number;
  demandeId: number;
  auteurId: number;
  contenu: string;
  visibilite: 'INTERNE' | 'PUBLIC';
  date: string;
}

interface Approbation {
  id: number;
  demandeId: number;
  etapeId: number;
  statut: 'EN_ATTENTE' | 'APPROUVE' | 'REJETE';
  approbateurId: number | null;
  date: string | null;
  commentaire: string | null;
  etape: { id: number; ordre: number; roleApprobateur: string; categorieId: number };
}

interface PieceJointe {
  id: number;
  demandeId: number;
  nomFichier: string;
  cheminFichier: string;
  dateUpload: string;
}

interface HistoriqueAction {
  id: number;
  demandeId: number;
  auteurId: number;
  action: string;
  date: string;
}

interface TimelineEvent {
  type: 'comment' | 'event';
  date: string;
  text?: string;
  comment?: Commentaire;
}

@Component({
  selector: 'app-detail-demande',
  standalone: true,
  imports: [Header, CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './detail-demande.html',
  styleUrl: './detail-demande.css',
})
export class DetailDemande implements OnInit {
  private route = inject(ActivatedRoute);
  private demandeService = inject(DemandeService);
  private departementService = inject(DepartementService);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  authService = inject(AuthService);
  departements = signal<{ id: number; nom: string }[]>([]);
  categories = signal<{ id: number; nom: string }[]>([]);

  demandeId = signal<number>(0);
  demande = signal<DemandeDetail | null>(null);
  approbations = signal<Approbation[]>([]);
  commentaires = signal<Commentaire[]>([]);
  piecesJointes = signal<PieceJointe[]>([]);
  historique = signal<HistoriqueAction[]>([]);

  loading = signal(true);
  error = signal<string | null>(null);
  actionError = signal<string | null>(null);
  submittingComment = signal(false);
  decidingApprobationId = signal<number | null>(null);
  changingStatut = signal(false);
  exportingPdf = signal(false);

  currentRole = computed(() => this.authService.user()?.role);
  currentUserId = computed(() => this.authService.user()?.id);

  commentForm = this.fb.group({
    contenu: ['', [Validators.required, Validators.minLength(2)]],
    visibilite: ['PUBLIC' as 'PUBLIC' | 'INTERNE'],
  });

  readonly statutLabels = STATUT_LABELS_DETAIL;
  readonly slaLabels = SLA_LABELS_DETAIL;

  // Liste ordonnée des étapes du circuit fusionnées avec leur statut
  // d'approbation, pour le panneau "Circuit d'approbation".
  circuitEtapes = computed(() => {
    return [...this.approbations()].sort((a, b) => a.etape.ordre - b.etape.ordre);
  });

  actionableApprobation = computed(() => {
    const role = this.currentRole();
    const d = this.demande();
    if (!role || !d || d.statut !== 'EN_ATTENTE_APPROBATION') return null;
    return (
      this.approbations().find(
        (a) => a.statut === 'EN_ATTENTE' && a.etape.roleApprobateur === role,
      ) ?? null
    );
  });

  canWriteInterne = computed(() => this.currentRole() !== 'EMPLOYE');
  canProgressStatut = computed(() => this.currentRole() !== 'EMPLOYE');
  canAnnuler = computed(() => {
  const d = this.demande();
  const userId = this.currentUserId();
  const role = this.currentRole();
  if (!d) return false;
  return role === 'ADMIN' || d.demandeur.id === userId;
});
  // Temps restant avant dépassement du SLA, approximatif, à titre d'affichage uniquement.
  slaTimeRemaining = computed(() => {
    const d = this.demande();
    if (!d || !d.dateLimiteSLA) return null;
    const diffMs = new Date(d.dateLimiteSLA).getTime() - Date.now();
    if (diffMs <= 0) return null;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours >= 1) return `${hours}h${minutes.toString().padStart(2, '0')}`;
    return `${minutes} min`;
  });

  // Fusionne les commentaires et les événements de l'historique en un seul flux chronologique.
  timeline = computed<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = [];

    for (const h of this.historique()) {
      // Ignore les entrées brutes de journal de commentaire ; le contenu du
      // commentaire est déjà rendu à partir de la liste des commentaires ci-dessous.
      if (h.action.startsWith('COMMENTAIRE')) continue;
      events.push({ type: 'event', date: h.date, text: this.describeAction(h.action) });
    }

    for (const c of this.commentaires()) {
      events.push({ type: 'comment', date: c.date, comment: c });
    }

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  });

  private describeAction(action: string): string {
    if (action === 'CREATION') return 'Demande créée';

    if (action.startsWith('CHANGEMENT_STATUT:')) {
      const [, transition] = action.split(':');
      const [from, to] = (transition ?? '').split('->');
      const fromLabel = this.statutLabels[from] ?? from;
      const toLabel = this.statutLabels[to] ?? to;
      return `Statut modifié de ${fromLabel} à ${toLabel}`;
    }

    if (action.startsWith('APPROBATION')) return "Étape d'approbation traitée";

    if (action.startsWith('PIECE_JOINTE:')) {
      const fileName = action.split(':').slice(1).join(':');
      return `Pièce jointe ajoutée : ${fileName}`;
    }

    return action;
  }

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);
    if (!id) {
      this.error.set('Identifiant de demande invalide');
      this.loading.set(false);
      return;
    }
    this.demandeId.set(id);
    await Promise.all([this.loadLookups(), this.loadAll()]);
  }

  private async loadLookups(): Promise<void> {
    try {
      const [depts, cats] = await Promise.all([
        this.departementService.getDepartements(),
        this.departementService.getCategories(),
      ]);
      this.departements.set(depts);
      this.categories.set(cats);
    } catch {
      // non bloquant
    }
  }

  async loadAll(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [demande, approbations, commentaires, pieces, historique] = await Promise.all([
        this.demandeService.getById(this.demandeId()),
        this.fetchApprobations(),
        this.fetchCommentaires(),
        this.fetchPiecesJointes(),
        this.fetchHistorique(),
      ]);
      this.demande.set(demande);
      this.approbations.set(approbations);
      this.commentaires.set(commentaires);
      this.piecesJointes.set(pieces);
      this.historique.set(historique);
    } catch (err: any) {
      this.error.set(
        err?.status === 403
          ? "Vous n'avez pas accès à cette demande"
          : err?.status === 404
            ? 'Demande introuvable'
            : 'Impossible de charger la demande',
      );
    } finally {
      this.loading.set(false);
    }
  }

  private fetchApprobations(): Promise<Approbation[]> {
    return firstValueFrom(
      this.http.get<Approbation[]>(
        `${environment.apiUrl}/demande/${this.demandeId()}/approbations`,
      ),
    );
  }

  private fetchCommentaires(): Promise<Commentaire[]> {
    return firstValueFrom(
      this.http.get<Commentaire[]>(
        `${environment.apiUrl}/demande/${this.demandeId()}/commentaires`,
      ),
    );
  }

  private fetchPiecesJointes(): Promise<PieceJointe[]> {
    return firstValueFrom(
      this.http.get<PieceJointe[]>(
        `${environment.apiUrl}/demande/${this.demandeId()}/pieces-jointes`,
      ),
    );
  }

  private fetchHistorique(): Promise<HistoriqueAction[]> {
    return firstValueFrom(
      this.http.get<HistoriqueAction[]>(
        `${environment.apiUrl}/demande/${this.demandeId()}/historique`,
      ),
    );
  }

  async submitComment(): Promise<void> {
    if (this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }
    this.submittingComment.set(true);
    this.actionError.set(null);
    try {
      const raw = this.commentForm.getRawValue();
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/demande/${this.demandeId()}/commentaires`, {
          contenu: raw.contenu,
          visibilite: raw.visibilite,
        }),
      );
      this.commentForm.reset({ contenu: '', visibilite: 'PUBLIC' });
      await this.loadAll();
    } catch (err: any) {
      this.actionError.set(err?.error?.message ?? "Erreur lors de l'ajout du commentaire");
    } finally {
      this.submittingComment.set(false);
    }
  }

  async decideApprobation(approbation: Approbation, decision: 'APPROUVE' | 'REJETE'): Promise<void> {
    this.decidingApprobationId.set(approbation.id);
    this.actionError.set(null);
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/approbations/${approbation.id}`, {
          statut: decision,
        }),
      );
      await this.loadAll();
    } catch (err: any) {
      this.actionError.set(err?.error?.message ?? "Erreur lors de la décision d'approbation");
    } finally {
      this.decidingApprobationId.set(null);
    }
  }

  async changeStatut(statut: StatutDemande): Promise<void> {
    this.changingStatut.set(true);
    this.actionError.set(null);
    try {
      await this.demandeService.updateStatut(this.demandeId(), statut);
      await this.loadAll();
    } catch (err: any) {
      this.actionError.set(err?.error?.message ?? 'Erreur lors du changement de statut');
    } finally {
      this.changingStatut.set(false);
    }
  }

  private pdfStatutColors(statut: StatutDemande): { bg: [number, number, number]; text: [number, number, number] } {
    if (statut === 'EN_ATTENTE_APPROBATION' || statut === 'EN_COURS') {
      return { bg: PDF_COLORS.amber, text: PDF_COLORS.navy };
    }
    if (statut === 'RESOLU' || statut === 'CLOTURE') {
      return { bg: [30, 132, 73], text: [255, 255, 255] };
    }
    if (statut === 'REJETE' || statut === 'ANNULE') {
      return { bg: [192, 57, 43], text: [255, 255, 255] };
    }
    return { bg: [238, 241, 244], text: PDF_COLORS.navy };
  }

  private pdfSlaColor(indicateur: IndicateurSLA): [number, number, number] {
    if (indicateur === 'RESPECTE') return [46, 204, 113];
    if (indicateur === 'A_RISQUE') return PDF_COLORS.amber;
    if (indicateur === 'DEPASSE') return [255, 107, 94];
    return PDF_COLORS.muted;
  }

  private pdfDrawChip(doc: any, x: number, y: number, text: string, bg: [number, number, number], textColor: [number, number, number]): number {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const textWidth = doc.getTextWidth(text);
    const w = textWidth + 10;
    const h = 7;
    doc.setFillColor(...bg);
    doc.roundedRect(x, y, w, h, 2, 2, 'F');
    doc.setTextColor(...textColor);
    doc.text(text, x + w / 2, y + h / 2 + 1.1, { align: 'center' });
    return w;
  }

  async downloadPdf(): Promise<void> {
    const d = this.demande();
    if (!d) return;

    this.exportingPdf.set(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF() as any;
      const ref = `DEM-${d.id.toString().padStart(3, '0')}`;
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 16;
      const contentWidth = pageWidth - marginX * 2;

      let y = drawPdfHeaderBand(doc, marginX, 'FICHE DE DEMANDE', `#${ref}`);

      // --- Titre ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(17);
      doc.setTextColor(...PDF_COLORS.navy);
      const titleLines = doc.splitTextToSize(d.titre, contentWidth);
      doc.text(titleLines, marginX, y);
      y += titleLines.length * 7 + 3;

      // --- Chips statut / SLA ---
      const statutColors = this.pdfStatutColors(d.statut);
      let chipX = marginX;
      chipX += this.pdfDrawChip(doc, chipX, y, this.statutLabels[d.statut], statutColors.bg, statutColors.text) + 4;
      this.pdfDrawChip(doc, chipX, y, `SLA · ${this.slaLabels[d.indicateurSLA]}`, this.pdfSlaColor(d.indicateurSLA), [255, 255, 255]);
      y += 14;

      // --- Métadonnées ---
      doc.setDrawColor(...PDF_COLORS.border);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 8;

      const metaCols: [string, string][] = [
        ['DEMANDEUR', `${d.demandeur.prenom} ${d.demandeur.nom}`],
        ['DÉPARTEMENT', this.departementName()],
        ['CATÉGORIE', this.categorieName()],
        ['CRÉÉE LE', this.formatDate(d.dateCreation)],
      ];
      const colWidth = contentWidth / metaCols.length;
      metaCols.forEach(([label, value], i) => {
        const colX = marginX + i * colWidth;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...PDF_COLORS.muted);
        doc.text(label, colX, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.setTextColor(...PDF_COLORS.navy);
        doc.text(doc.splitTextToSize(value, colWidth - 6), colX, y + 5.5);
      });
      y += 20;

      // --- Description ---
      y = drawPdfSectionTitle(doc, 'DESCRIPTION', marginX, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const descLines = doc.splitTextToSize(d.description, contentWidth - 12);
      const descBoxHeight = descLines.length * 5 + 10;
      y = ensurePdfSpace(doc, y, descBoxHeight);
      doc.setFillColor(...PDF_COLORS.bg);
      doc.setDrawColor(...PDF_COLORS.border);
      doc.roundedRect(marginX, y, contentWidth, descBoxHeight, 2, 2, 'FD');
      doc.setTextColor(...PDF_COLORS.body);
      doc.text(descLines, marginX + 6, y + 7);
      y += descBoxHeight + 12;

      // --- Pièces jointes ---
      const pieces = this.piecesJointes();
      if (pieces.length > 0) {
        y = ensurePdfSpace(doc, y, 10 + pieces.length * 6);
        y = drawPdfSectionTitle(doc, 'PIÈCES JOINTES', marginX, y);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...PDF_COLORS.body);
        for (const p of pieces) {
          y = ensurePdfSpace(doc, y, 6);
          doc.setFillColor(...PDF_COLORS.amber);
          doc.circle(marginX + 1, y - 1.4, 0.8, 'F');
          doc.text(p.nomFichier, marginX + 5, y);
          y += 6;
        }
      }

      stampPdfFooter(doc, marginX);
      doc.save(`${ref}.pdf`);
    } finally {
      this.exportingPdf.set(false);
    }
  }

  async downloadPieceJointe(piece: PieceJointe): Promise<void> {
    try {
      const blob = await firstValueFrom(
        this.http.get(
          `${environment.apiUrl}/demande/${this.demandeId()}/pieces-jointes/${piece.id}/download`,
          { responseType: 'blob' },
        ),
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = piece.nomFichier;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      this.actionError.set('Erreur lors du téléchargement du fichier');
    }
  }

  formatDateTime(dateStr: string | null): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR');
  }

  departementName(): string {
    const d = this.demande();
    if (!d) return '—';
    return this.departements().find((dep) => dep.id === d.departementId)?.nom ?? `Dépt ${d.departementId}`;
  }

  categorieName(): string {
    const d = this.demande();
    if (!d) return '—';
    return this.categories().find((c) => c.id === d.categorieId)?.nom ?? `Catégorie ${d.categorieId}`;
  }
}
