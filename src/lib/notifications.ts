import type { NotificationKind } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { sendMail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

export type NotifyCopy = {
  titleEn: string;
  titleKo: string;
  bodyEn: string;
  bodyKo: string;
};

export async function createNotifications(opts: {
  userIds: string[];
  kind: NotificationKind;
  copy: NotifyCopy;
  href?: string | null;
  payload?: Record<string, unknown> | null;
  email?: boolean;
}): Promise<void> {
  const uniqueIds = [...new Set(opts.userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return;

  await prisma.notification.createMany({
    data: uniqueIds.map((userId) => ({
      userId,
      kind: opts.kind,
      titleEn: opts.copy.titleEn,
      titleKo: opts.copy.titleKo,
      bodyEn: opts.copy.bodyEn,
      bodyKo: opts.copy.bodyKo,
      href: opts.href ?? null,
      payload: (opts.payload ?? undefined) as Prisma.InputJsonValue | undefined,
    })),
  });

  if (opts.email === false) return;

  const users = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { email: true },
  });
  const site = process.env.AUTH_URL?.trim().replace(/\/$/, "") || "";
  const inbox = site ? `${site}/inbox` : "/inbox";

  await Promise.all(
    users.map((u) => {
      if (!u.email) return Promise.resolve();
      const text = [
        opts.copy.bodyEn,
        "",
        opts.copy.bodyKo,
        "",
        `Inbox: ${inbox}`,
      ].join("\n");
      return sendMail({
        to: u.email,
        subject: `[CIDA] ${opts.copy.titleEn}`,
        text,
      });
    })
  );
}

export function serializeNotification(n: {
  id: string;
  kind: NotificationKind;
  titleEn: string;
  titleKo: string;
  bodyEn: string;
  bodyKo: string;
  href: string | null;
  payload: unknown;
  readAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: n.id,
    kind: n.kind,
    titleEn: n.titleEn,
    titleKo: n.titleKo,
    bodyEn: n.bodyEn,
    bodyKo: n.bodyKo,
    href: n.href,
    payload: n.payload,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}
