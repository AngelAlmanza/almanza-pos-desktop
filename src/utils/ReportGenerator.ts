import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { Sale, SalesReport, TopProduct } from '../models';

export class ReportGenerator {
  static generateSalesReportPDF(
    report: SalesReport,
    topProducts: TopProduct[],
    startDate: string,
    endDate: string
  ): void {
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

    doc.save(`reporte_ventas_${startDate}_${endDate}.pdf`);
  }

  static generateSalesExcel(sales: Sale[], startDate: string, endDate: string): void {
    // Main sales sheet
    const salesData = sales.map(s => ({
      'ID': s.id,
      'Fecha': new Date(s.created_at).toLocaleString(),
      'Cajero': s.user_name || '',
      'Total': s.total,
      'Método de Pago': s.payment_method === 'cash' ? 'Efectivo' : s.payment_method,
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

    XLSX.writeFile(wb, `ventas_${startDate}_${endDate}.xlsx`);
  }
}
