/**
 * Calendar-year style label: for AY "2024–2025", Fall → 2024 …, Spring / Summer
 * → 2025 … (academic year’s ending calendar year) so users read a single year per term.
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
  if (k === "summer" || k.startsWith("summer")) {
    return `${y + 1} ${seasonWords}`;
  }

  return `${t.academicYear.label} · ${t.termSeason.label}`;
}
