export type TermLike = {
  kind?: "ACADEMIC" | "GROUP" | string | null;
  groupLabel?: string | null;
  academicYear: { label?: string; startYear?: number | null };
  termSeason?: { key: string; label?: string } | null;
  sortOrder?: number;
};

export function isGroupTerm(t: {
  kind?: string | null;
  termSeason?: unknown;
}): boolean {
  return t.kind === "GROUP" || t.termSeason == null;
}

/**
 * Calendar-year style label: for AY "2024–2025", Fall → 2024 …, Spring / Summer
 * → 2025 … (academic year’s ending calendar year) so users read a single year per term.
 */
export function formatTermForDisplay(t: TermLike): string {
  if (isGroupTerm(t)) {
    const name = t.groupLabel?.trim() || "Group";
    const year = t.academicYear.label?.trim();
    return year ? `${year} · ${name}` : name;
  }
  const season = t.termSeason!;
  const start = t.academicYear.startYear;
  if (start == null || Number.isNaN(Number(start))) {
    return `${t.academicYear.label ?? ""} · ${season.label ?? season.key}`;
  }
  const y = Number(start);
  const k = season.key.toLowerCase();
  const seasonWords = (season.label ?? season.key).replace(/\s+Semester\s*$/i, "").trim();

  if (k === "fall" || k.startsWith("fall")) {
    return `${y} ${seasonWords}`;
  }
  if (k === "spring" || k.startsWith("spring")) {
    return `${y + 1} ${seasonWords}`;
  }
  if (k === "summer" || k.startsWith("summer")) {
    return `${y + 1} ${seasonWords}`;
  }

  return `${t.academicYear.label ?? ""} · ${season.label ?? season.key}`;
}

/** Higher = later in the calendar (Spring 2026 < Summer 2026 < Fall 2026). Groups sort after that year’s terms. */
export function termChronology(t: TermLike): number {
  const y = Number(t.academicYear.startYear);
  if (Number.isNaN(y)) {
    return t.sortOrder ?? 0;
  }
  if (isGroupTerm(t)) {
    return (y + 1) * 10 + 8 + (t.sortOrder ?? 0) / 1000;
  }
  const k = (t.termSeason?.key ?? "").toLowerCase();
  let season = 0;
  if (k === "spring" || k.startsWith("spring")) season = 1;
  else if (k === "summer" || k.startsWith("summer")) season = 2;
  else if (k === "fall" || k.startsWith("fall")) season = 3;
  else if (typeof t.sortOrder === "number") season = t.sortOrder + 1;
  const calendarYear = season === 3 ? y : y + 1;
  return calendarYear * 10 + season;
}
