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

function groupCodeOptionsByLeadingNumber(opts: Opt[]): { lead: number; items: Opt[] }[] {
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
          <p className="text-sm text-amber-200/90">{t("teach.noCodeCatalog")}</p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-slate-500">{t("teach.codeNoMatch")}</p>
        ) : (
          <div className="space-y-2">
            {codeRows.map(({ lead, items }) => (
              <div
                key={lead}
                className="flex flex-wrap gap-1.5 border-b border-white/5 pb-2 last:border-b-0 last:pb-0"
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
                          ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.2)]"
                          : "border-white/10 bg-white/5 text-slate-200 hover:border-white/25 hover:bg-white/10",
                        isDisabled
                          ? "cursor-not-allowed opacity-40"
                          : "cursor-pointer",
                        !o.isActive && isOn ? "text-amber-200/90" : "",
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
