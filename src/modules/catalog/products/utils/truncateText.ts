// Corta el texto en `max` caracteres y agrega "…" cuando no cabe.
export function truncateText(text: string, max: number): string {
  if (max <= 0) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}
