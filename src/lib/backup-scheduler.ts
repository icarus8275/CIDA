import { ensureScheduledBackup } from "@/lib/backup";

const INTERVAL_MS = 3 * 60 * 60 * 1000;
const g = globalThis as unknown as { __cidaBackupTimer?: ReturnType<typeof setInterval> };

export function startBackupScheduler(): void {
  if (g.__cidaBackupTimer) return;
  void ensureScheduledBackup();
  g.__cidaBackupTimer = setInterval(() => {
    void ensureScheduledBackup();
  }, INTERVAL_MS);
  g.__cidaBackupTimer.unref?.();
}
