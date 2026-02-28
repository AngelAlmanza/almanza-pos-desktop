import { downloadDir, join } from '@tauri-apps/api/path';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { Sale, SalesReport, TopProduct } from '../models';
import { paymentMethodLabel } from './PaymentLabels';

export type ReportFormat = 'pdf' | 'excel';

export class ReportGenerator {
  static async generateSalesReportPDF(
    report: SalesReport,
    topProducts: TopProduct[],
    startDate: string,
    endDate: string
  ): Promise<string | null> {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Reporte de Ventas', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Almanza POS', 105, 27, { align: 'center' });

    // Date range
    doc.setFontSize(11);
    doc.text(`Período: ${startDate} al ${endDate}`, 14, 40);

    // Summary
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen General', 14, 52);

    autoTable(doc, {
      startY: 56,
      head: [['Concepto', 'Valor']],
      body: [
        ['Total Ventas', `$${report.total_sales.toFixed(2)}`],
        ['Total Transacciones', String(report.total_transactions)],
        ['Promedio por Venta', `$${report.average_sale.toFixed(2)}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [21, 101, 192] },
      margin: { left: 14, right: 14 },
    });

    // Top products
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentY = ((doc as any).lastAutoTable?.finalY as number) ?? 100;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Productos Más Vendidos', 14, currentY + 15);

    autoTable(doc, {
      startY: currentY + 19,
      head: [['#', 'Producto', 'Cantidad', 'Ingresos']],
      body: topProducts.map((p, i) => [
        String(i + 1),
        p.product_name,
        String(p.total_quantity),
        `$${p.total_revenue.toFixed(2)}`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [0, 137, 123] },
      margin: { left: 14, right: 14 },
    });

    // Sales detail on new page
    if (report.sales.length > 0) {
      doc.addPage();
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Detalle de Ventas', 14, 20);

      autoTable(doc, {
        startY: 24,
        head: [['ID', 'Fecha', 'Cajero', 'Total', 'Estado']],
        body: report.sales.map(s => [
          `#${s.id}`,
          new Date(s.created_at).toLocaleString(),
          s.user_name || '',
          `$${s.total.toFixed(2)}`,
          s.status === 'completed' ? 'Completada' : 'Cancelada',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [21, 101, 192] },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8 },
      });
    }

    // Footer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageCount = (doc as any).getNumberOfPages() as number;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generado: ${new Date().toLocaleString()} | Página ${i} de ${pageCount}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
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
    const uint8Array = new Uint8Array(arrayBuffer);
    await writeFile(path, uint8Array);
    return path;
  }

  static async generateSalesExcel(
    sales: Sale[],
    startDate: string,
    endDate: string
  ): Promise<string | null> {
    // Main sales sheet
    const salesData = sales.map(s => ({
      'ID': s.id,
      'Fecha': new Date(s.created_at).toLocaleString(),
      'Cajero': s.user_name || '',
      'Total': s.total,
      'Método de Pago': paymentMethodLabel(s.payment_method),
      'Monto Pagado': s.payment_amount,
      'Cambio': s.change_amount,
      'Estado': s.status === 'completed' ? 'Completada' : 'Cancelada',
    }));

    // Detail items sheet
    const itemsData: Record<string, unknown>[] = [];
    for (const sale of sales) {
      for (const item of sale.items) {
        itemsData.push({
          'Venta ID': sale.id,
          'Fecha': new Date(sale.created_at).toLocaleString(),
          'Producto': item.product_name,
          'Cantidad': item.quantity,
          'Precio Unitario': item.unit_price,
          'Subtotal': item.subtotal,
        });
      }
    }

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(salesData);
    const ws2 = XLSX.utils.json_to_sheet(itemsData);

    XLSX.utils.book_append_sheet(wb, ws1, 'Ventas');
    XLSX.utils.book_append_sheet(wb, ws2, 'Detalle');

    const filename = `ventas_${startDate}_${endDate}.xlsx`;
    const defaultDir = await downloadDir();
    const suggestedPath = await join(defaultDir, filename);

    const path = await save({
      defaultPath: suggestedPath,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    });

    if (!path) return null;

    const arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    const uint8Array = new Uint8Array(arrayBuffer);
    await writeFile(path, uint8Array);
    return path;
  }
}
