import { downloadDir, join } from '@tauri-apps/api/path';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ACCENT_COLOR, BRAND_COLOR, BRAND_DARK, BUSINESS_INFO, MARGIN_X, PAGE_HEADER_HEIGHT, ROW_ALT, XL_ACCENT, XL_BRAND, XL_DARK, XL_GRAY_TEXT, XL_GREEN, XL_RED } from '../constants/Reports';
import type { SalesReport, TopProduct } from '../models';
import type { PaymentMethod } from '../types';
import { addSheetBrandHeader, applyBrandHeader, applyColHeader, applyDataCell } from './excelHelpers';
import { paymentMethodLabel } from './PaymentLabels';
import { addPageFooter, addPageHeader, sectionTitle } from './pdfHelpers';
import { computeMetrics, filterSales } from './reportHelpers';

export class ReportGenerator {
  static async generateSalesReportPDF(
    report: SalesReport,
    topProducts: TopProduct[],
    startDate: string,
    endDate: string,
    includeCancelled: boolean = false,
  ): Promise<string | null> {
    const doc = new jsPDF();
    const REPORT_TITLE = 'Reporte de Ventas';
    const metrics = computeMetrics(report.sales);
    const filteredSales = filterSales(report.sales, includeCancelled);

    // Common autoTable options applied to every table for consistent margins and
    // page-header redraws on overflow pages.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageOpts: any = {
      margin: { top: PAGE_HEADER_HEIGHT + 6, left: MARGIN_X, right: MARGIN_X },
      didAddPage: () => { addPageHeader(doc, REPORT_TITLE); },
    };

    // ── PAGE 1: summary ──────────────────────────────────────────────────────

    addPageHeader(doc, REPORT_TITLE);

    let y = PAGE_HEADER_HEIGHT + 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 99, 128);
    doc.text(`Período: ${startDate}  al  ${endDate}`, MARGIN_X, y);
    if (!includeCancelled) {
      doc.text(
        '* Solo ventas completadas',
        doc.internal.pageSize.width - MARGIN_X,
        y,
        { align: 'right' },
      );
    }
    doc.setTextColor(0, 0, 0);
    y += 8;

    // Resumen general
    sectionTitle(doc, 'Resumen General', y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Concepto', 'Valor']],
      body: [
        ['Total Ventas (completadas)', `$${metrics.totalRevenue.toFixed(2)}`],
        ['Transacciones Completadas', String(metrics.completedCount)],
        ['Promedio por Venta', `$${metrics.averageSale.toFixed(2)}`],
        ['Transacciones Canceladas', String(metrics.cancelledCount)],
        ['Monto Cancelado', `$${metrics.cancelledAmount.toFixed(2)}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: BRAND_COLOR, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      alternateRowStyles: { fillColor: ROW_ALT },
      ...pageOpts,
    });

    // Desglose por método de pago
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = ((doc as any).lastAutoTable?.finalY as number) + 10;
    sectionTitle(doc, 'Desglose por Método de Pago', y);
    y += 4;
    const paymentEntries = Object.entries(metrics.byPaymentMethod) as [
      PaymentMethod,
      { count: number; amount: number },
    ][];
    autoTable(doc, {
      startY: y,
      head: [['Método de Pago', 'Transacciones', 'Total']],
      body:
        paymentEntries.length > 0
          ? paymentEntries.map(([method, data]) => [
            paymentMethodLabel(method),
            String(data.count),
            `$${data.amount.toFixed(2)}`,
          ])
          : [['Sin datos', '', '']],
      theme: 'grid',
      headStyles: { fillColor: BRAND_DARK, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right', fontStyle: 'bold' } },
      alternateRowStyles: { fillColor: ROW_ALT },
      ...pageOpts,
    });

    // Productos más vendidos
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = ((doc as any).lastAutoTable?.finalY as number) + 10;
    sectionTitle(doc, 'Productos Más Vendidos', y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [['#', 'Producto', 'Cantidad', 'Ingresos']],
      body:
        topProducts.length > 0
          ? topProducts.map((p, i) => [
            String(i + 1),
            p.product_name,
            String(p.total_quantity),
            `$${p.total_revenue.toFixed(2)}`,
          ])
          : [['', 'Sin datos en el período', '', '']],
      theme: 'grid',
      headStyles: { fillColor: ACCENT_COLOR, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: ROW_ALT },
      ...pageOpts,
    });

    // ── PAGE 2+: sales detail ─────────────────────────────────────────────────

    if (filteredSales.length > 0) {
      doc.addPage();
      addPageHeader(doc, REPORT_TITLE);
      y = PAGE_HEADER_HEIGHT + 8;
      sectionTitle(
        doc,
        `Detalle de Ventas${includeCancelled ? ' (completadas y canceladas)' : ' (completadas)'}`,
        y,
      );
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [['ID', 'Fecha', 'Cajero', 'Método', 'Total', 'Estado']],
        body: filteredSales.map((s) => [
          `#${s.id}`,
          new Date(s.created_at).toLocaleString('es-MX'),
          s.user_name || '',
          paymentMethodLabel(s.payment_method),
          `$${s.total.toFixed(2)}`,
          s.status === 'completed' ? 'Completada' : 'Cancelada',
        ]),
        theme: 'grid',
        headStyles: { fillColor: BRAND_COLOR, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 14 },
          4: { halign: 'right', fontStyle: 'bold' },
          5: { halign: 'center' },
        },
        alternateRowStyles: { fillColor: ROW_ALT },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        didParseCell: (data: any) => {
          if (data.column.index === 5 && data.section === 'body') {
            const text: string = data.cell.text[0];
            data.cell.styles.textColor =
              text === 'Cancelada' ? [185, 28, 28] : [13, 107, 95];
          }
        },
        ...pageOpts,
      });
    }

    // ── Footers on every page ─────────────────────────────────────────────────

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageCount = (doc as any).getNumberOfPages() as number;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      addPageFooter(doc, i, pageCount);
    }

    const filename = `reporte_ventas_${startDate}_${endDate}.pdf`;
    const defaultDir = await downloadDir();
    const suggestedPath = await join(defaultDir, filename);

    const path = await save({
      defaultPath: suggestedPath,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (!path) return null;

    const arrayBuffer = doc.output('arraybuffer');
    await writeFile(path, new Uint8Array(arrayBuffer));
    return path;
  }

  static async generateSalesExcel(
    report: SalesReport,
    startDate: string,
    endDate: string,
    includeCancelled: boolean = false,
  ): Promise<string | null> {
    const metrics = computeMetrics(report.sales);
    const filteredSales = filterSales(report.sales, includeCancelled);
    const paymentEntries = Object.entries(metrics.byPaymentMethod) as [
      PaymentMethod,
      { count: number; amount: number },
    ][];

    const wb = new ExcelJS.Workbook();
    wb.creator = BUSINESS_INFO.name;
    wb.created = new Date();
    wb.modified = new Date();

    // ── Sheet 1: Resumen ──────────────────────────────────────────────────────

    const wsResumen = wb.addWorksheet('Resumen');
    wsResumen.columns = [
      { width: 36 },
      { width: 18 },
      { width: 16 },
    ];

    let r = addSheetBrandHeader(wsResumen, startDate, endDate, 'Reporte de Ventas', 3);

    // Section: Resumen General
    wsResumen.mergeCells(r, 1, r, 3);
    applyBrandHeader(wsResumen, r, 1, 'RESUMEN GENERAL', XL_BRAND);
    wsResumen.getRow(r).height = 18;
    r++;

    [1, 2, 3].forEach((i) => applyColHeader(wsResumen.getCell(r, i), XL_DARK));
    wsResumen.getCell(r, 1).value = 'Concepto';
    wsResumen.getCell(r, 2).value = 'Valor';
    wsResumen.getCell(r, 3).value = '';
    wsResumen.getRow(r).height = 16;
    r++;

    const summaryData: [string, number | string][] = [
      ['Total Ventas (completadas)', metrics.totalRevenue],
      ['Transacciones Completadas', metrics.completedCount],
      ['Promedio por Venta', metrics.averageSale],
      ['Transacciones Canceladas', metrics.cancelledCount],
      ['Monto Cancelado', metrics.cancelledAmount],
    ];

    summaryData.forEach(([label, value], idx) => {
      const isAmount = typeof value === 'number' && (label.includes('Venta') || label.includes('Cancelado') || label.includes('Promedio'));
      const isCancelled = label.includes('Cancelad');
      const labelCell = wsResumen.getCell(r, 1);
      const valueCell = wsResumen.getCell(r, 2);
      labelCell.value = label;
      valueCell.value = value;
      applyDataCell(labelCell, idx);
      applyDataCell(valueCell, idx, {
        align: 'right',
        bold: true,
        color: isCancelled ? XL_RED : undefined,
      });
      if (isAmount) valueCell.numFmt = '"$"#,##0.00';
      wsResumen.getRow(r).height = 15;
      r++;
    });

    r++; // spacer

    // Section: Desglose por Método de Pago
    wsResumen.mergeCells(r, 1, r, 3);
    applyBrandHeader(wsResumen, r, 1, 'DESGLOSE POR MÉTODO DE PAGO', XL_ACCENT);
    wsResumen.getRow(r).height = 18;
    r++;

    ['Método de Pago', 'Transacciones', 'Total'].forEach((h, i) => {
      const cell = wsResumen.getCell(r, i + 1);
      cell.value = h;
      applyColHeader(cell, XL_DARK);
    });
    wsResumen.getRow(r).height = 16;
    r++;

    if (paymentEntries.length > 0) {
      paymentEntries.forEach(([method, data], idx) => {
        const c1 = wsResumen.getCell(r, 1);
        const c2 = wsResumen.getCell(r, 2);
        const c3 = wsResumen.getCell(r, 3);
        c1.value = paymentMethodLabel(method);
        c2.value = data.count;
        c3.value = data.amount;
        applyDataCell(c1, idx);
        applyDataCell(c2, idx, { align: 'center' });
        applyDataCell(c3, idx, { align: 'right', bold: true });
        c3.numFmt = '"$"#,##0.00';
        wsResumen.getRow(r).height = 15;
        r++;
      });
    } else {
      wsResumen.mergeCells(r, 1, r, 3);
      const cell = wsResumen.getCell(r, 1);
      cell.value = 'Sin ventas completadas en el período';
      applyDataCell(cell, 0, { color: XL_GRAY_TEXT });
      r++;
    }

    // ── Sheet 2: Ventas ───────────────────────────────────────────────────────

    const wsVentas = wb.addWorksheet('Ventas');
    wsVentas.columns = [
      { width: 8 },
      { width: 22 },
      { width: 20 },
      { width: 14 },
      { width: 18 },
      { width: 14 },
      { width: 13 },
      { width: 13 },
    ];

    r = addSheetBrandHeader(wsVentas, startDate, endDate, 'Detalle de Ventas', 8);

    const ventasColLabel = includeCancelled
      ? 'VENTAS (COMPLETADAS Y CANCELADAS)'
      : 'VENTAS COMPLETADAS';
    wsVentas.mergeCells(r, 1, r, 8);
    applyBrandHeader(wsVentas, r, 1, ventasColLabel, XL_BRAND);
    wsVentas.getRow(r).height = 18;
    r++;

    const ventasHeaders = ['ID', 'Fecha', 'Cajero', 'Total', 'Método de Pago', 'Monto Pagado', 'Cambio', 'Estado'];
    ventasHeaders.forEach((h, i) => {
      const cell = wsVentas.getCell(r, i + 1);
      cell.value = h;
      applyColHeader(cell, XL_DARK);
    });
    wsVentas.getRow(r).height = 16;
    r++;

    filteredSales.forEach((s, idx) => {
      const isCompleted = s.status === 'completed';
      const cells = [
        wsVentas.getCell(r, 1),
        wsVentas.getCell(r, 2),
        wsVentas.getCell(r, 3),
        wsVentas.getCell(r, 4),
        wsVentas.getCell(r, 5),
        wsVentas.getCell(r, 6),
        wsVentas.getCell(r, 7),
        wsVentas.getCell(r, 8),
      ];
      cells[0].value = `#${s.id}`;
      cells[1].value = new Date(s.created_at).toLocaleString('es-MX');
      cells[2].value = s.user_name || '';
      cells[3].value = s.total;
      cells[4].value = paymentMethodLabel(s.payment_method);
      cells[5].value = s.payment_amount;
      cells[6].value = s.change_amount;
      cells[7].value = isCompleted ? 'Completada' : 'Cancelada';

      applyDataCell(cells[0], idx, { align: 'center' });
      applyDataCell(cells[1], idx);
      applyDataCell(cells[2], idx);
      applyDataCell(cells[3], idx, { align: 'right', bold: true });
      applyDataCell(cells[4], idx);
      applyDataCell(cells[5], idx, { align: 'right' });
      applyDataCell(cells[6], idx, { align: 'right' });
      applyDataCell(cells[7], idx, {
        align: 'center',
        bold: true,
        color: isCompleted ? XL_GREEN : XL_RED,
      });

      cells[3].numFmt = '"$"#,##0.00';
      cells[5].numFmt = '"$"#,##0.00';
      cells[6].numFmt = '"$"#,##0.00';

      wsVentas.getRow(r).height = 15;
      r++;
    });

    if (filteredSales.length === 0) {
      wsVentas.mergeCells(r, 1, r, 8);
      const cell = wsVentas.getCell(r, 1);
      cell.value = 'No hay ventas en el período seleccionado';
      applyDataCell(cell, 0, { color: XL_GRAY_TEXT });
    }

    // ── Sheet 3: Detalle de ítems ─────────────────────────────────────────────

    const wsDetalle = wb.addWorksheet('Detalle');
    wsDetalle.columns = [
      { width: 10 },
      { width: 22 },
      { width: 30 },
      { width: 12 },
      { width: 16 },
      { width: 13 },
    ];

    r = addSheetBrandHeader(wsDetalle, startDate, endDate, 'Detalle de Ítems', 6);

    wsDetalle.mergeCells(r, 1, r, 6);
    applyBrandHeader(wsDetalle, r, 1, 'PRODUCTOS POR VENTA', XL_ACCENT);
    wsDetalle.getRow(r).height = 18;
    r++;

    const detalleHeaders = ['Venta ID', 'Fecha', 'Producto', 'Cantidad', 'Precio Unitario', 'Subtotal'];
    detalleHeaders.forEach((h, i) => {
      const cell = wsDetalle.getCell(r, i + 1);
      cell.value = h;
      applyColHeader(cell, XL_DARK);
    });
    wsDetalle.getRow(r).height = 16;
    r++;

    let itemIdx = 0;
    for (const sale of filteredSales) {
      for (const item of sale.items) {
        const cells = [
          wsDetalle.getCell(r, 1),
          wsDetalle.getCell(r, 2),
          wsDetalle.getCell(r, 3),
          wsDetalle.getCell(r, 4),
          wsDetalle.getCell(r, 5),
          wsDetalle.getCell(r, 6),
        ];
        cells[0].value = sale.id;
        cells[1].value = new Date(sale.created_at).toLocaleString('es-MX');
        cells[2].value = item.product_name;
        cells[3].value = item.quantity;
        cells[4].value = item.unit_price;
        cells[5].value = item.subtotal;

        applyDataCell(cells[0], itemIdx, { align: 'center' });
        applyDataCell(cells[1], itemIdx);
        applyDataCell(cells[2], itemIdx);
        applyDataCell(cells[3], itemIdx, { align: 'center' });
        applyDataCell(cells[4], itemIdx, { align: 'right' });
        applyDataCell(cells[5], itemIdx, { align: 'right', bold: true });

        cells[4].numFmt = '"$"#,##0.00';
        cells[5].numFmt = '"$"#,##0.00';

        wsDetalle.getRow(r).height = 15;
        r++;
        itemIdx++;
      }
    }

    if (itemIdx === 0) {
      wsDetalle.mergeCells(r, 1, r, 6);
      const cell = wsDetalle.getCell(r, 1);
      cell.value = 'No hay ítems en el período seleccionado';
      applyDataCell(cell, 0, { color: XL_GRAY_TEXT });
    }

    // ── Save ──────────────────────────────────────────────────────────────────

    const filename = `ventas_${startDate}_${endDate}.xlsx`;
    const defaultDir = await downloadDir();
    const suggestedPath = await join(defaultDir, filename);

    const path = await save({
      defaultPath: suggestedPath,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    });
    if (!path) return null;

    const arrayBuffer = await wb.xlsx.writeBuffer();
    await writeFile(path, new Uint8Array(arrayBuffer as ArrayBuffer));
    return path;
  }
}
