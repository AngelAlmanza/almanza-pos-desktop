// ── Layout constants ─────────────────────────────────────────────────────────

import { XlsxColor } from "../types";

const PAGE_HEADER_HEIGHT = 22;
const MARGIN_X = 14;
const BRAND_COLOR: [number, number, number] = [13, 107, 95];
const BRAND_DARK: [number, number, number] = [45, 106, 79];
const ACCENT_COLOR: [number, number, number] = [0, 137, 123];
const ROW_ALT: [number, number, number] = [248, 246, 243];

// ── Dummy business info (replace with configurable settings later) ────────────

const BUSINESS_INFO = {
  name: 'Abarrotes El Almanza',
  address: 'Calle Morelos #123, Col. Centro',
  city: 'Culiacán, Sin. C.P. 80000',
  phone: '(667) 123-4567',
  rfc: 'AAXX800101ABC',
};

// --- Excel Constants
const XL_BRAND: XlsxColor = { argb: 'FF0D6B5F' };
const XL_DARK: XlsxColor = { argb: 'FF2D6A4F' };
const XL_ACCENT: XlsxColor = { argb: 'FF00897B' };
const XL_ROW_ALT: XlsxColor = { argb: 'FFF8F6F3' };
const XL_WHITE: XlsxColor = { argb: 'FFFFFFFF' };
const XL_RED: XlsxColor = { argb: 'FFB91C1C' };
const XL_GREEN: XlsxColor = { argb: 'FF2D6A4F' };
const XL_GRAY_TEXT: XlsxColor = { argb: 'FF5A6380' };

export {
  PAGE_HEADER_HEIGHT,
  MARGIN_X,
  BRAND_COLOR,
  BRAND_DARK,
  ACCENT_COLOR,
  ROW_ALT,
  BUSINESS_INFO,
  XL_BRAND,
  XL_DARK,
  XL_ACCENT,
  XL_ROW_ALT,
  XL_WHITE,
  XL_RED,
  XL_GREEN,
  XL_GRAY_TEXT,
}