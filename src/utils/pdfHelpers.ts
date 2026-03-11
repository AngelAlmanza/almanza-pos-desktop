// ── PDF helpers ──────────────────────────────────────────────────────────────

import jsPDF from "jspdf";
import { BRAND_COLOR, BUSINESS_INFO, MARGIN_X, PAGE_HEADER_HEIGHT } from "../constants/Reports";

export function addPageHeader(doc: jsPDF, title: string): void {
  const pageWidth = doc.internal.pageSize.width;

  // Brand bar
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pageWidth, PAGE_HEADER_HEIGHT, 'F');

  // Store name
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(BUSINESS_INFO.name, MARGIN_X, 9);

  // Report title (right-aligned)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(title, pageWidth - MARGIN_X, 9, { align: 'right' });

  // Address / contact line
  doc.setFontSize(7);
  doc.text(
    `${BUSINESS_INFO.address} | ${BUSINESS_INFO.city} | Tel: ${BUSINESS_INFO.phone} | RFC: ${BUSINESS_INFO.rfc}`,
    MARGIN_X,
    17,
  );

  doc.setTextColor(0, 0, 0);
}

export function addPageFooter(doc: jsPDF, pageNum: number, total: number): void {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  doc.setDrawColor(210, 210, 210);
  doc.line(MARGIN_X, pageHeight - 12, pageWidth - MARGIN_X, pageHeight - 12);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(140, 140, 140);
  doc.text(
    `Generado: ${new Date().toLocaleString('es-MX')} · Página ${pageNum} de ${total}`,
    pageWidth / 2,
    pageHeight - 7,
    { align: 'center' },
  );
  doc.setTextColor(0, 0, 0);
}

export function sectionTitle(doc: jsPDF, text: string, y: number): void {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 32, 53);
  doc.text(text, MARGIN_X, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
}