// ── Excel helpers ─────────────────────────────────────────────────────────────

import { Alignment, Borders, Cell, Worksheet } from "exceljs";
import { BUSINESS_INFO, XL_BRAND, XL_ROW_ALT, XL_WHITE } from "../constants/Reports";
import { FillSolid, XlsxColor } from "../types";

const THIN_BORDER: Partial<Borders> = {
  top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
};

export function solidFill(color: XlsxColor): FillSolid {
  return { type: 'pattern', pattern: 'solid', fgColor: color };
}

/** Applies a bold section header style to a single cell (brand-colored bg). */
export function applyBrandHeader(
  ws: Worksheet,
  row: number,
  col: number,
  text: string,
  fillColor: XlsxColor,
): void {
  const cell = ws.getCell(row, col);
  cell.value = text;
  cell.fill = solidFill(fillColor);
  cell.font = { bold: true, color: XL_WHITE, size: 11 };
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
}

/** Applies column-header style (bold, brand bg, white text, centered). */
export function applyColHeader(cell: Cell, fillColor: XlsxColor): void {
  cell.fill = solidFill(fillColor);
  cell.font = { bold: true, color: XL_WHITE, size: 9 };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.border = THIN_BORDER;
}

/** Applies data row style with optional alternating background. */
export function applyDataCell(
  cell: Cell,
  rowIndex: number,
  options: { align?: Alignment['horizontal']; bold?: boolean; color?: XlsxColor } = {},
): void {
  cell.fill = solidFill(rowIndex % 2 === 0 ? XL_ROW_ALT : { argb: 'FFFFFFFF' });
  cell.font = { size: 9, bold: options.bold ?? false, color: options.color };
  cell.alignment = { vertical: 'middle', horizontal: options.align ?? 'left' };
  cell.border = THIN_BORDER;
}

/**
 * Writes the business-info header block at the top of a sheet and returns
 * the next empty row number after the block.
 */
export function addSheetBrandHeader(
  ws: Worksheet,
  startDate: string,
  endDate: string,
  sheetTitle: string,
  totalCols: number,
): number {
  // Row 1 – store name (merged, brand bg)
  ws.mergeCells(1, 1, 1, totalCols);
  const nameCell = ws.getCell(1, 1);
  nameCell.value = BUSINESS_INFO.name;
  nameCell.fill = solidFill(XL_BRAND);
  nameCell.font = { bold: true, color: XL_WHITE, size: 13 };
  nameCell.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(1).height = 22;

  // Row 2 – address (merged, slightly lighter brand bg)
  ws.mergeCells(2, 1, 2, totalCols);
  const addrCell = ws.getCell(2, 1);
  addrCell.value = `${BUSINESS_INFO.address} | ${BUSINESS_INFO.city}`;
  addrCell.fill = solidFill({ argb: 'FF0F7D6E' });
  addrCell.font = { color: XL_WHITE, size: 9 };
  addrCell.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(2).height = 16;

  // Row 3 – phone / RFC (merged)
  ws.mergeCells(3, 1, 3, totalCols);
  const contactCell = ws.getCell(3, 1);
  contactCell.value = `Tel: ${BUSINESS_INFO.phone}   |   RFC: ${BUSINESS_INFO.rfc}`;
  contactCell.fill = solidFill({ argb: 'FF0F7D6E' });
  contactCell.font = { color: { argb: 'FFCCECE8' }, size: 8 };
  contactCell.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(3).height = 14;

  // Row 4 – spacer
  ws.getRow(4).height = 6;

  // Row 5 – report title + period (merged)
  ws.mergeCells(5, 1, 5, totalCols);
  const titleCell = ws.getCell(5, 1);
  titleCell.value = `${sheetTitle}   —   Período: ${startDate}  al  ${endDate}`;
  titleCell.fill = solidFill({ argb: 'FFE8F5F3' });
  titleCell.font = { bold: true, color: { argb: 'FF0D6B5F' }, size: 10 };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(5).height = 18;

  // Row 6 – spacer
  ws.getRow(6).height = 6;

  return 7; // next usable row
}