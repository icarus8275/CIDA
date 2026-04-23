"use client";

import { useMemo } from "react";

export type CodeLink = {
  id: string;
  codeNumberId: string;
  codeNumber: {
    id: string;
    value: string;
    label: string | null;
    isActive: boolean;
  };
};

export type CatalogRow = {
  id: string;
  value: string;
  label: string | null;
  sortOrder: number;
};

export type Opt = {
  id: string;
  value: string;
  label: string | null;
  isActive: boolean;
  sortOrder: number;
};

/** 코드 문자열 앞의 연속 숫자(예: 10A → 10, 1B → 1). 숫자 없으면 맨 뒤 그룹. */
const NON_NUMERIC_LEAD = 9_999;

export function codeLeadingIndex(value: string): number {
  const m = value.trim().match(/^\d+/);
  if (!m) {
    return NON_NUMERIC_LEAD;
  }
  const n = parseInt(m[0], 10);
  return Number.isFinite(n) ? n : NON_NUMERIC_LEAD;
}

export function groupCodeOptionsByLeadingNumber(
  opts: Opt[]
): { lead: number; items: Opt[] }[] {
  const map = new Map<number, Opt[]>();
  for (const o of opts) {
    const lead = codeLeadingIndex(o.value);
    const list = map.get(lead) ?? [];
    list.push(o);
    map.set(lead, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return a.value.localeCompare(b.value, undefined, { numeric: true });
    });
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([lead, items]) => ({ lead, items }));
}

export function buildOptions(
  catalog: CatalogRow[],
  itemCodes: CodeLink[] | undefined
): Opt[] {
  const m = new Map<string, Opt>();
  for (const c of catalog) {
    m.set(c.id, {
      id: c.id,
      value: c.value,
      label: c.label,
      isActive: true,
      sortOrder: c.sortOrder,
    });
  }
  for (const link of itemCodes ?? []) {
    const n = link.codeNumber;
    if (!m.has(n.id)) {
      m.set(n.id, {
        id: n.id,
        value: n.value,
        label: n.label,
        isActive: n.isActive,
        sortOrder: 999_999,
      });
    }
  }
  return [...m.values()].sort((a, b) => {
    const la = codeLeadingIndex(a.value);
    const lb = codeLeadingIndex(b.value);
    if (la !== lb) {
      return la - lb;
    }
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    return a.value.localeCompare(b.value, undefined, { numeric: true });
  });
}

export function CodePicker({
  t,
  options,
  valueIds,
  onChange,
  filter,
  onFilterChange,
  disabled,
  idPrefix,
}: {
  t: (k: string) => string;
  options: Opt[];
  valueIds: string[];
  onChange: (ids: string[]) => void;
  filter: string;
  onFilterChange: (v: string) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  const selected = new Set(valueIds);
  const q = filter.trim().toLowerCase();
  const shown = useMemo(
    () =>
      !q
        ? options
        : options.filter(
            (o) =>
              o.value.toLowerCase().includes(q) ||
              (o.label && o.label.toLowerCase().includes(q))
          ),
    [options, q]
  );

  const codeRows = useMemo(
    () => groupCodeOptionsByLeadingNumber(shown),
    [shown]
  );

  return (
    <div className="space-y-2">
      <input
        type="search"
        className="input-glass w-full max-w-md px-2 py-1 text-sm"
        placeholder={t("teach.codeFilter")}
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        disabled={disabled}
        autoComplete="off"
      />
      <div className="glass min-h-16 max-h-52 overflow-y-auto p-2">
        {options.length === 0 ? (
          <p className="text-sm text-amber-900/90">{t("teach.noCodeCatalog")}</p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-app-muted/85">{t("teach.codeNoMatch")}</p>
        ) : (
          <div className="space-y-2">
            {codeRows.map(({ lead, items }) => (
              <div
                key={lead}
                className="flex flex-wrap gap-1.5 border-b border-app-border/50 pb-2 last:border-b-0 last:pb-0"
              >
                {items.map((o) => {
                  const isOn = selected.has(o.id);
                  const isDisabled = disabled || (!o.isActive && !isOn);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      id={`${idPrefix}-${o.id}`}
                      title={
                        o.label && o.label.trim()
                          ? o.label
                          : isOn && !o.isActive
                            ? "inactive (saved)"
                            : undefined
                      }
                      aria-pressed={isOn}
                      disabled={isDisabled}
                      onClick={() => {
                        const next = new Set(valueIds);
                        if (next.has(o.id)) {
                          next.delete(o.id);
                        } else {
                          next.add(o.id);
                        }
                        onChange([...next]);
                      }}
                      className={[
                        "min-h-[2.25rem] min-w-[2.5rem] rounded border px-2 font-mono text-xs transition",
                        isOn
                          ? "border-app-link/35 bg-app-link/15 text-app-link shadow-[inset_0_0_0_1px_rgba(10,102,194,0.22)]"
                          : "border-app-border/70 bg-app-card/55 text-app-fg/92 hover:border-app-border hover:bg-app-card/75",
                        isDisabled
                          ? "cursor-not-allowed opacity-40"
                          : "cursor-pointer",
                        !o.isActive && isOn ? "text-amber-900/90" : "",
                      ].join(" ")}
                    >
                      {o.value}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Explore/CIDA: 항목에 붙은 코드를 교수 화면과 동일 그룹·버튼 스타일로 표시 */
export function exploreCodesToOpts(
  codes: { value: string; label: string | null }[]
): Opt[] {
  return codes.map((c, i) => ({
    id: `ex-${c.value}-${i}`,
    value: c.value,
    label: c.label,
    isActive: true,
    sortOrder: 0,
  }));
}

function sortCodeOptsByValue(opts: Opt[]): Opt[] {
  return [...opts].sort((a, b) => {
    const la = codeLeadingIndex(a.value);
    const lb = codeLeadingIndex(b.value);
    if (la !== lb) {
      return la - lb;
    }
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    return a.value.localeCompare(b.value, undefined, { numeric: true });
  });
}

export function CodesReadonlyGrouped({
  codes,
  onCodeClick,
  idPrefix = "ex",
  className = "",
  /** Explore: all chips in one flex-wrapped row; no grouping by leading digit */
  oneLine = false,
}: {
  codes: { value: string; label: string | null }[];
  onCodeClick: (value: string) => void;
  idPrefix?: string;
  className?: string;
  oneLine?: boolean;
}) {
  const opts = useMemo(() => exploreCodesToOpts(codes), [codes]);
  const rows = useMemo(
    () => groupCodeOptionsByLeadingNumber(opts),
    [opts]
  );
  const flatSorted = useMemo(() => sortCodeOptsByValue(opts), [opts]);
  if (codes.length === 0) {
    return null;
  }
  if (oneLine) {
    return (
      <div className={`flex flex-wrap items-center gap-1.5 ${className}`.trim()}>
        {flatSorted.map((o) => (
          <button
            key={o.id}
            type="button"
            id={`${idPrefix}-${o.id}`}
            title={o.label?.trim() ? o.label : undefined}
            onClick={() => onCodeClick(o.value)}
            className="min-h-[2.25rem] min-w-[2.5rem] cursor-pointer rounded border border-app-border/70 bg-app-card/55 px-2 font-mono text-xs text-app-fg/92 transition hover:border-app-border hover:bg-app-card/75"
          >
            {o.value}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className={`space-y-2 ${className}`.trim()}>
      {rows.map(({ lead, items }) => (
        <div
          key={lead}
          className="flex flex-wrap gap-1.5 border-b border-app-border/50 pb-2 last:border-b-0 last:pb-0"
        >
          {items.map((o) => (
            <button
              key={o.id}
              type="button"
              id={`${idPrefix}-${o.id}`}
              title={o.label?.trim() ? o.label : undefined}
              onClick={() => onCodeClick(o.value)}
              className="min-h-[2.25rem] min-w-[2.5rem] cursor-pointer rounded border border-app-border/70 bg-app-card/55 px-2 font-mono text-xs text-app-fg/92 transition hover:border-app-border hover:bg-app-card/75"
            >
              {o.value}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
