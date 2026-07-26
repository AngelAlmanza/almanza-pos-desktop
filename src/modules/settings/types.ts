export type SettingValueType = 'string' | 'multiline' | 'number' | 'boolean' | 'image_path';
export type PrinterPaperSize = '58mm' | '80mm' | '100mm' | string;
export type PrinterCutType = 'full' | 'partial' | 'none';

export interface Setting {
  key: string;
  value: string | null;
  value_type: SettingValueType;
  label: string;
  description: string | null;
  group_name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PrinterSettings {
  enabled: boolean;
  auto_print_sale: boolean;
  transport: string;
  display_name: string;
  usb_vendor_id: string | null;
  usb_product_id: string | null;
  port_hint: string | null;
  paper_size: PrinterPaperSize;
  dpi: number;
  cut_type: PrinterCutType;
  encoding: string;
}

export interface PrinterInfo {
  id: string;
  name: string;
  vendor_id: string;
  product_id: string;
  port_name: string | null;
  transport: string;
}

export interface UpdateSettingDTO {
  key: string;
  value: string | null;
}

export interface CreateSettingDTO {
  key: string;
  value?: string;
  value_type: string;
  label: string;
  description?: string;
  group_name: string;
  sort_order?: number;
}

export interface SavePrinterConfigDTO {
  enabled: boolean;
  auto_print_sale: boolean;
  transport: string;
  display_name: string;
  usb_vendor_id: string | null;
  usb_product_id: string | null;
  port_hint: string | null;
  paper_size: string;
  dpi: number;
  cut_type: 'full' | 'partial' | 'none';
  encoding: string;
}
