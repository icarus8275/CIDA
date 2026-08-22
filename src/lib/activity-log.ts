import { prisma } from "@/lib/prisma";
import { listUserLabel } from "@/lib/user-display";

export type ActivityActor = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
};

export function actorLabel(actor: ActivityActor | null | undefined): string {
  return listUserLabel(actor?.name, actor?.email) || "Unknown user";
}

export async function logActivity(
  actor: ActivityActor | null | undefined,
  summaryEn: string,
  summaryKo: string
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        actorId: actor?.id ?? null,
        actorName: actorLabel(actor),
        actorEmail: actor?.email ?? null,
        summaryEn,
        summaryKo,
      },
    });
  } catch (e) {
    console.error("[activity-log]", e);
  }
}
