// Helpers partagés pour générer des PDF au thème CIRES FLOW (bandeau navy,
// logo, pied de page) — utilisés par le tableau de bord et la fiche de demande.

export type RGB = [number, number, number];

export const PDF_COLORS = {
  navy: [3, 28, 45] as RGB,
  amber: [255, 170, 1] as RGB,
  border: [225, 232, 236] as RGB,
  muted: [122, 133, 145] as RGB,
  body: [58, 68, 78] as RGB,
  bg: [247, 249, 250] as RGB,
};

// Trace le pictogramme "pulsation" du logo CIRES FLOW (même tracé que le SVG de l'en-tête app).
export function drawPdfLogoMark(doc: any, x: number, y: number, size: number, color: RGB): void {
  const pt = (px: number, py: number): [number, number] => [x + (px / 100) * size, y + (py / 100) * size];
  const segments: [number, number][] = [pt(33, 50), pt(43, 50), pt(47.6, 30), pt(52.4, 70), pt(57, 50), pt(67, 50)];
  doc.setDrawColor(...color);
  doc.setLineWidth(size * 0.045);
  doc.setLineCap('round');
  doc.setLineJoin('round');
  for (let i = 0; i < segments.length - 1; i++) {
    doc.line(segments[i][0], segments[i][1], segments[i + 1][0], segments[i + 1][1]);
  }
}

// Dessine le bandeau navy d'en-tête (logo + "CIRES FLOW" + sous-titre + ligne à droite) et renvoie le y de départ du contenu.
export function drawPdfHeaderBand(
  doc: any,
  marginX: number,
  subtitleLabel: string,
  rightLine: string,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...PDF_COLORS.navy);
  doc.rect(0, 0, pageWidth, 28, 'F');

  drawPdfLogoMark(doc, marginX, 6, 16, [255, 255, 255]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('CIRES FLOW', marginX + 20, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.amber);
  doc.text(subtitleLabel, pageWidth - marginX, 11, { align: 'right' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(rightLine, pageWidth - marginX, 18, { align: 'right' });

  return 40;
}

// Ajoute une nouvelle page si l'espace restant est insuffisant, pour éviter qu'un titre
// de section reste seul en bas de page pendant que son contenu démarre sur la suivante.
export function ensurePdfSpace(doc: any, y: number, needed: number, topAfterBreak = 24): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomLimit = pageHeight - 20;
  if (y + needed <= bottomLimit) return y;
  doc.addPage();
  return topAfterBreak;
}

// Titre de section avec soulignement amber, renvoie le y suivant.
export function drawPdfSectionTitle(doc: any, text: string, marginX: number, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text(text, marginX, y);
  doc.setDrawColor(...PDF_COLORS.amber);
  doc.setLineWidth(0.8);
  doc.line(marginX, y + 1.5, marginX + 16, y + 1.5);
  return y + 8;
}

// Tamponne le pied de page (ligne, copyright, date de génération, numéro de page) sur toutes les pages du document.
export function stampPdfFooter(doc: any, marginX: number): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCount = doc.internal.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...PDF_COLORS.border);
    doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text('© 2026 CIRES FLOW', marginX, pageHeight - 9);
    doc.text(
      `Généré le ${new Date().toLocaleDateString('fr-FR')} — Page ${i}/${pageCount}`,
      pageWidth - marginX,
      pageHeight - 9,
      { align: 'right' },
    );
  }
}

// Styles jspdf-autotable communs au thème (bandeau navy, lignes alternées, bordures fines).
export const PDF_TABLE_THEME = {
  theme: 'grid' as const,
  headStyles: { fillColor: PDF_COLORS.navy, textColor: [255, 255, 255] as RGB, fontStyle: 'bold' as const, fontSize: 10 },
  bodyStyles: { textColor: PDF_COLORS.body, fontSize: 9.5 },
  alternateRowStyles: { fillColor: PDF_COLORS.bg },
  styles: { cellPadding: 4, lineColor: PDF_COLORS.border, lineWidth: 0.1, font: 'helvetica' },
};
