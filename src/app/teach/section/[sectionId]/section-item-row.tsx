"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  itemType: { id: string; key: string; label: string };
  codes: CodeLink[];
};

export function SectionItemRow({
  t,
  it,
  catalog,
  onReload,
}: {
  t: (k: string) => string;
  it: SectionItem;
  catalog: CatalogRow[];
  onReload: () => Promise<void>;
}) {
  const itRef = useRef(it);
  itRef.current = it;

  const [title, setTitle] = useState(() => it.title ?? "");
  const [url, setUrl] = useState(() => it.oneDriveUrl ?? "");
  const [linkLabel, setLinkLabel] = useState(() => it.linkTitle ?? "");
  const [codeIds, setCodeIds] = useState(() =>
    it.codes.map((c) => c.codeNumberId)
  );
  const [codeFilter, setCodeFilter] = useState("");

  const codeKey = useMemo(
    () => sortIdsKey(it.codes.map((c) => c.codeNumberId)),
    [it.codes]
  );

  useEffect(() => {
    setTitle(it.title ?? "");
  }, [it.id, it.title]);

  useEffect(() => {
    setUrl(it.oneDriveUrl ?? "");
    setLinkLabel(it.linkTitle ?? "");
  }, [it.id, it.oneDriveUrl, it.linkTitle]);

  useEffect(() => {
    setCodeIds(it.codes.map((c) => c.codeNumberId));
  }, [it.id, codeKey]);

  useEffect(() => {
    if (title === (it.title ?? "")) return;
    const timer = setTimeout(() => {
      if (title === (itRef.current.title ?? "")) return;
      void (async () => {
        const r = await fetch(`/api/teach/course-items/${itRef.current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim() === "" ? null : title }),
        });
        if (r.ok) await onReload();
      })();
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [title, it.title, it.id, onReload]);

  useEffect(() => {
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
      void (async () => {
        const u = itRef.current;
        const r = await fetch(`/api/teach/course-items/${u.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            oneDriveUrl: url.trim() === "" ? null : url.trim(),
            linkTitle: linkLabel.trim() === "" ? null : linkLabel.trim(),
          }),
        });
        if (r.ok) await onReload();
      })();
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [url, linkLabel, it.oneDriveUrl, it.linkTitle, it.id, onReload]);

  useEffect(() => {
    const server = sortIdsKey(itRef.current.codes.map((c) => c.codeNumberId));
    const local = sortIdsKey(codeIds);
    if (server === local) return;
    const timer = setTimeout(() => {
      const s2 = sortIdsKey(
        itRef.current.codes.map((c) => c.codeNumberId)
      );
      const l2 = sortIdsKey(codeIds);
      if (s2 === l2) return;
      void (async () => {
        const u = itRef.current;
        const r = await fetch(`/api/teach/course-items/${u.id}/codes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codeNumberIds: codeIds }),
        });
        if (r.ok) {
          await onReload();
        } else {
          alert(t("teach.codeSaveFail"));
          await onReload();
        }
      })();
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [codeIds, onReload, t, it.id]);

  const options = useMemo(
    () => buildOptions(catalog, it.codes),
    [catalog, it.codes]
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
      <div className="mb-1 space-y-1">
        <p className="text-xs text-app-muted/85">{t("teach.codeCatalogPicks")}</p>
        <p className="text-[11px] text-app-muted/85">{t("teach.autoSaveHint")}</p>
        <CodePicker
          t={t}
          idPrefix={`item-${it.id}`}
          options={options}
          valueIds={codeIds}
          onChange={setCodeIds}
          filter={codeFilter}
          onFilterChange={setCodeFilter}
        />
      </div>
      <div className="mt-1">
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
}
