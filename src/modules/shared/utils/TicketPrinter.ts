import type { CashRegisterSummary } from '@modules/shared/types/cashRegister';

export class TicketPrinter {
  private static readonly TICKET_WIDTH = 280;

  static printCashRegisterCloseTicket(summary: CashRegisterSummary): void {
    const printWindow = window.open(
      "",
      "_blank",
      `width=${this.TICKET_WIDTH + 40},height=700`,
    );
    if (!printWindow) return;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; width: ${this.TICKET_WIDTH}px; padding: 10px; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; }
    h1 { font-size: 16px; margin-bottom: 4px; }
    .section-title { font-weight: bold; margin: 4px 0; text-align: center; font-size: 11px; }
  </style>
</head>
<body>
  <div class="center">
    <h1>ALMANZA POS</h1>
    <p class="bold">CORTE DE CAJA</p>
  </div>
  <div class="divider"></div>
  <div class="row"><span>Caja #:</span><span class="bold">${summary.session.id}</span></div>
  <div class="row"><span>Cajero:</span><span>${summary.session.user_name || ""}</span></div>
  <div class="row"><span>Apertura:</span><span>${new Date(summary.session.opened_at).toLocaleString()}</span></div>
  ${summary.session.closed_at ? `<div class="row"><span>Cierre:</span><span>${new Date(summary.session.closed_at).toLocaleString()}</span></div>` : ""}
  <div class="divider"></div>
  <div class="row"><span>Fondo Inicial:</span><span>$${summary.session.opening_amount.toFixed(2)}</span></div>
  <div class="row"><span>Total Ventas:</span><span class="bold">$${summary.total_sales.toFixed(2)}</span></div>
  <div class="row"><span>Transacciones:</span><span>${summary.total_transactions}</span></div>
  <div class="divider"></div>
  <div class="section-title">DESGLOSE DE COBROS</div>
  <div class="row"><span>Efectivo MXN:</span><span>$${summary.sales_cash_mxn.toFixed(2)}</span></div>
  <div class="row"><span>Efectivo USD:</span><span>$${summary.sales_cash_usd.toFixed(2)} USD</span></div>
  <div class="row"><span>Transferencias:</span><span>$${summary.sales_transfer.toFixed(2)}</span></div>
  <div class="section-title">PAGOS A CUENTA</div>
  <div class="row"><span>Efectivo MXN:</span><span>$${summary.account_payments_cash_mxn.toFixed(2)}</span></div>
  <div class="row"><span>Efectivo USD:</span><span>$${summary.account_payments_cash_usd.toFixed(2)} USD</span></div>
  <div class="row"><span>Transferencias:</span><span>$${summary.account_payments_transfer.toFixed(2)}</span></div>
  <div class="row"><span>Cambio entregado:</span><span>$${summary.total_change_given.toFixed(2)}</span></div>
  <div class="divider"></div>
  <div class="section-title">ESPERADO VS REAL</div>
  <div class="row"><span>Esperado MXN:</span><span>$${summary.expected_cash_mxn.toFixed(2)}</span></div>
  <div class="row"><span>Esperado USD:</span><span>$${summary.expected_cash_usd.toFixed(2)}</span></div>
  ${
    summary.session.status === "closed"
      ? `
  <div class="row"><span>En caja MXN:</span><span>$${summary.actual_cash_mxn.toFixed(2)}</span></div>
  <div class="row"><span>En caja USD:</span><span>$${summary.actual_cash_usd.toFixed(2)}</span></div>
  <div class="divider"></div>
  <div class="row bold">
    <span>Dif. MXN:</span>
    <span style="color: ${summary.difference_mxn >= 0 ? "green" : "red"}">${summary.difference_mxn >= 0 ? "+" : ""}$${summary.difference_mxn.toFixed(2)}</span>
  </div>
  <div class="row bold">
    <span>Dif. USD:</span>
    <span style="color: ${summary.difference_usd >= 0 ? "green" : "red"}">${summary.difference_usd >= 0 ? "+" : ""}$${summary.difference_usd.toFixed(2)}</span>
  </div>
  `
      : ""
  }
  ${
    summary.session.exchange_rate
      ? `
  <div class="divider"></div>
  <div class="row"><span>T/C USD:</span><span>$${summary.session.exchange_rate.toFixed(2)}</span></div>
  `
      : ""
  }
  <div class="divider"></div>
  <div class="center" style="margin-top: 8px; font-size: 10px;">
    <p>Almanza POS</p>
  </div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  }
}
