/**
 * Calendar-year style label: for AY "2024–2025", Fall → 2024 …, Spring → 2025 …
 * so users read a single calendar year per term.
 */
export function formatTermForDisplay(t: {
  academicYear: { label: string; startYear?: number | null };
  termSeason: { key: string; label: string };
}): string {
  const start = t.academicYear.startYear;
  if (start == null || Number.isNaN(Number(start))) {
    return `${t.academicYear.label} · ${t.termSeason.label}`;
  }
  const y = Number(start);
  const k = t.termSeason.key.toLowerCase();
  const seasonWords = t.termSeason.label.replace(/\s+Semester\s*$/i, "").trim();

  if (k === "fall" || k.startsWith("fall")) {
    return `${y} ${seasonWords}`;
  }
  if (k === "spring" || k.startsWith("spring")) {
    return `${y + 1} ${seasonWords}`;
  }

  return `${t.academicYear.label} · ${t.termSeason.label}`;
}
