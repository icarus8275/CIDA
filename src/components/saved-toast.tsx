"use client";

export function SavedToast({
  show,
  message,
}: {
  show: boolean;
  message: string;
}) {
  if (!show) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-6 left-1/2 z-[70] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 rounded-full border border-emerald-300/90 bg-emerald-50 px-4 py-2.5 text-center text-sm font-medium text-emerald-950 shadow-lg"
    >
      {message}
    </div>
  );
}
