export function OnSiteBadge({
  label,
  size = "md",
}: {
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={
        size === "sm"
          ? "inline-flex items-center rounded-md bg-amber-500 px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-sm ring-1 ring-amber-700/40"
          : "inline-flex items-center rounded-md bg-amber-500 px-2.5 py-1 text-sm font-extrabold uppercase tracking-wide text-white shadow-md ring-2 ring-amber-700/30"
      }
    >
      {label}
    </span>
  );
}
