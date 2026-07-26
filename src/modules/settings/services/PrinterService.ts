import { invoke } from '@tauri-apps/api/core';
import type { PrinterInfo, PrinterSettings, SavePrinterConfigDTO } from '@modules/settings/types';

export class PrinterService {
  static async getConfig(): Promise<PrinterSettings> {
    return invoke<PrinterSettings>('get_printer_config');
  }

  static async saveConfig(config: SavePrinterConfigDTO): Promise<void> {
    return invoke<void>('save_printer_config', { config });
  }

  static async detectUsbPrinters(): Promise<PrinterInfo[]> {
    return invoke<PrinterInfo[]>('detect_usb_printers');
  }

  static async testPrinter(): Promise<void> {
    return invoke<void>('test_printer');
  }

  static async printSaleTicket(saleId: number): Promise<void> {
    return invoke<void>('print_sale_ticket', { saleId });
  }
}
