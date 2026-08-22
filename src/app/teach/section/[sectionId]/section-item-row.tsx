"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { OnSiteBadge } from "@/components/on-site-badge";
import { CodePicker, buildOptions, type CatalogRow, type CodeLink } from "./section-codes-shared";

const DEBOUNCE_MS = 500;

function sortIdsKey(ids: string[]) {
  return [...ids].sort().join("\0");
}

export type SectionItem = {
  id: string;
  number: number;
  title: string | null;
  oneDriveUrl: string | null;
  linkTitle: string | null;
  onSiteDisplay: boolean;
  itemType: { id: string; key: string; label: string };
  codes: CodeLink[];
};

export type SectionItemRowHandle = {
  save: () => Promise<boolean>;
};

export const SectionItemRow = forwardRef<
  SectionItemRowHandle,
  {
    t: (k: string) => string;
    it: SectionItem;
    catalog: CatalogRow[];
    courseCodeIds: string[];
    onReload: () => Promise<void>;
    onSaved?: () => void;
  }
>(function SectionItemRow(
  { t, it, catalog, courseCodeIds, onReload, onSaved },
  ref
) {
  const itRef = useRef(it);
  itRef.current = it;

  const [title, setTitle] = useState(() => it.title ?? "");
  const [url, setUrl] = useState(() => it.oneDriveUrl ?? "");
  const [linkLabel, setLinkLabel] = useState(() => it.linkTitle ?? "");
  const [onSiteDisplay, setOnSiteDisplay] = useState(() => it.onSiteDisplay);
  const [codeIds, setCodeIds] = useState(() =>
    it.codes.map((c) => c.codeNumberId)
  );
  const [codeFilter, setCodeFilter] = useState("");
  const [copyBusy, setCopyBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const skipAutosave = useRef(false);

  useEffect(() => {
    setTitle(it.title ?? "");
  }, [it.id, it.title]);

  useEffect(() => {
    setUrl(it.oneDriveUrl ?? "");
    setLinkLabel(it.linkTitle ?? "");
    setOnSiteDisplay(it.onSiteDisplay);
  }, [it.id, it.oneDriveUrl, it.linkTitle, it.onSiteDisplay]);

  useEffect(() => {
    setCodeIds(it.codes.map((c) => c.codeNumberId));
  }, [it.id]);

  async function persist(opts?: { silent?: boolean }): Promise<boolean> {
    const u = itRef.current;
    const [metaR, codesR] = await Promise.all([
      fetch(`/api/teach/course-items/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() === "" ? null : title,
          oneDriveUrl: url.trim() === "" ? null : url.trim(),
          linkTitle: linkLabel.trim() === "" ? null : linkLabel.trim(),
          onSiteDisplay,
        }),
      }),
      fetch(`/api/teach/course-items/${u.id}/codes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeNumberIds: codeIds }),
      }),
    ]);
    if (!metaR.ok || !codesR.ok) {
      if (!opts?.silent) alert(t("teach.codeSaveFail"));
      await onReload();
      return false;
    }
    skipAutosave.current = true;
    await onReload();
    if (!opts?.silent) onSaved?.();
    return true;
  }

  useImperativeHandle(ref, () => ({
    save: () => persist(),
  }));

  useEffect(() => {
    if (skipAutosave.current) {
      skipAutosave.current = false;
      return;
    }
    if (onSiteDisplay === it.onSiteDisplay) return;
    const timer = setTimeout(() => {
      if (onSiteDisplay === itRef.current.onSiteDisplay) return;
      void persist({ silent: true });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [onSiteDisplay, it.onSiteDisplay, it.id]);

  useEffect(() => {
    if (skipAutosave.current) {
      skipAutosave.current = false;
      return;
    }
    if (title === (it.title ?? "")) return;
    const timer = setTimeout(() => {
      if (title === (itRef.current.title ?? "")) return;
      void persist({ silent: true });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [title, it.title, it.id]);

  useEffect(() => {
    if (skipAutosave.current) {
      skipAutosave.current = false;
      return;
    }
    if (
      url === (it.oneDriveUrl ?? "") &&
      linkLabel === (it.linkTitle ?? "")
    ) {
      return;
    }
    const timer = setTimeout(() => {
      if (
        url === (itRef.current.oneDriveUrl ?? "") &&
        linkLabel === (itRef.current.linkTitle ?? "")
      ) {
        return;
      }
      void persist({ silent: true });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [url, linkLabel, it.oneDriveUrl, it.linkTitle, it.id]);

  useEffect(() => {
    if (skipAutosave.current) {
      skipAutosave.current = false;
      return;
    }
    const server = sortIdsKey(itRef.current.codes.map((c) => c.codeNumberId));
    const local = sortIdsKey(codeIds);
    if (server === local) return;
    const timer = setTimeout(() => {
      const s2 = sortIdsKey(
        itRef.current.codes.map((c) => c.codeNumberId)
      );
      const l2 = sortIdsKey(codeIds);
      if (s2 === l2) return;
      void persist({ silent: true });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [codeIds, it.id]);

  const options = useMemo(
    () => buildOptions(catalog, it.codes, courseCodeIds),
    [catalog, it.codes, courseCodeIds]
  );

  return (
    <li className="glass p-3">
      <div className="mb-2">
        <span className="font-medium text-app-fg">
          {it.itemType.label} {it.number}
        </span>
      </div>
      <div className="mb-2 space-y-1">
        <label className="text-xs text-app-muted/90" htmlFor={`item-title-${it.id}`}>
          {t("teach.itemTitleOpt")}
        </label>
        <input
          id={`item-title-${it.id}`}
          className="input-glass w-full px-2 py-1 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("teach.customTitle")}
        />
      </div>
      <div className="mb-2 space-y-1">
        <label className="flex items-center gap-2 text-xs text-app-muted/90">
          <input
            type="checkbox"
            className="size-3.5 rounded border-app-border"
            checked={onSiteDisplay}
            onChange={(e) => setOnSiteDisplay(e.target.checked)}
          />
          {t("teach.onSiteDisplay")}
        </label>
        <p className="text-[11px] text-app-muted/85">{t("teach.onSiteDisplayHint")}</p>
      </div>
      <div className="mb-2 space-y-1">
        <label className="text-xs text-app-muted/90" htmlFor={`item-od-${it.id}`}>
          {t("teach.odShareLink")}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <input
            id={`item-od-${it.id}`}
            className="input-glass min-w-0 flex-1 px-2 py-1 text-sm"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
          />
          <input
            className="input-glass w-full px-2 py-1 text-sm sm:w-40"
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            placeholder={t("teach.linkLabelOpt")}
            aria-label={t("teach.linkLabelOpt")}
          />
        </div>
        <div className="space-y-1">
          {onSiteDisplay && <OnSiteBadge label={t("teach.onSiteDisplay")} size="sm" />}
          {it.oneDriveUrl && (
            <a
              href={it.oneDriveUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-app-link hover:underline"
            >
              {it.linkTitle || t("teach.openFile")}
            </a>
          )}
        </div>
      </div>
      <div className="mb-1 space-y-1">
        <p className="text-xs text-app-muted/85">{t("teach.codeCatalogPicks")}</p>
        {courseCodeIds.length === 0 ? (
          <p className="text-xs text-amber-900/90">{t("teach.courseCodesEmpty")}</p>
        ) : (
          <>
            <p className="text-[11px] text-app-muted/85">{t("teach.codeNumbersHint")}</p>
            <p className="text-[11px] text-app-muted/85">{t("teach.autoSaveHint")}</p>
          </>
        )}
        <CodePicker
          t={t}
          idPrefix={`item-${it.id}`}
          options={options}
          valueIds={codeIds}
          onChange={setCodeIds}
          filter={codeFilter}
          onFilterChange={setCodeFilter}
          disabled={courseCodeIds.length === 0}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={saveBusy}
          className="btn-glass-primary px-3 py-1 text-xs disabled:opacity-50"
          onClick={async () => {
            setSaveBusy(true);
            try {
              await persist();
            } finally {
              setSaveBusy(false);
            }
          }}
        >
          {saveBusy ? t("teach.loading") : t("teach.save")}
        </button>
        <button
          type="button"
          disabled={copyBusy}
          className="text-xs text-app-link hover:underline disabled:opacity-50"
          onClick={async () => {
            setCopyBusy(true);
            try {
              const r = await fetch(`/api/teach/course-items/${it.id}/copy`, {
                method: "POST",
              });
              if (!r.ok) {
                alert(t("teach.copyItemFail"));
                return;
              }
              await onReload();
            } finally {
              setCopyBusy(false);
            }
          }}
        >
          {copyBusy ? t("teach.loading") : t("teach.copyItem")}
        </button>
        <button
          type="button"
          className="text-xs text-app-danger hover:underline"
          onClick={async () => {
            if (!confirm(t("teach.deleteConfirm"))) return;
            await fetch(`/api/teach/course-items/${it.id}`, {
              method: "DELETE",
            });
            await onReload();
          }}
        >
          {t("teach.deleteItem")}
        </button>
      </div>
    </li>
  );
});
