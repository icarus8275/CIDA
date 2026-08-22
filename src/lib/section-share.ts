import { actorLabel, logActivity } from "@/lib/activity-log";
import { createNotifications } from "@/lib/notifications";
import { formatTermForDisplay } from "@/lib/term-display";
import { listUserLabel } from "@/lib/user-display";
import { prisma } from "@/lib/prisma";

export const courseItemInclude = {
  itemType: true,
  codes: {
    orderBy: { codeNumber: { value: "asc" as const } },
    include: { codeNumber: true },
  },
} as const;

type Actor = { id: string; name?: string | null; email?: string | null };

async function offeringPath(courseOfferingId: string): Promise<string> {
  const off = await prisma.courseOffering.findUnique({
    where: { id: courseOfferingId },
    include: {
      course: true,
      term: { include: { academicYear: true, termSeason: true } },
    },
  });
  if (!off) return "a course";
  return `${formatTermForDisplay(off.term)} · ${off.course.name}`;
}

export async function getActiveShareGroup(courseOfferingId: string) {
  return prisma.courseShareGroup.findFirst({
    where: { courseOfferingId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      requests: {
        where: { status: "PENDING" },
        include: {
          target: { select: { id: true, name: true, email: true } },
          requester: { select: { id: true, name: true, email: true } },
        },
      },
      poolSection: { select: { id: true, label: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function isShareMember(
  courseOfferingId: string,
  userId: string
): Promise<boolean> {
  const row = await prisma.courseShareMember.findFirst({
    where: {
      userId,
      shareGroup: { courseOfferingId },
    },
  });
  return !!row;
}

export async function resolveWriteSectionId(
  sectionId: string,
  userId: string,
  role: "ADMIN" | "PROFESSOR" | "CIDA"
): Promise<string> {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { id: true, courseOfferingId: true },
  });
  if (!section) return sectionId;
  const group = await getActiveShareGroup(section.courseOfferingId);
  if (!group || group.members.length < 2) return sectionId;
  const member =
    role === "ADMIN" || group.members.some((m) => m.userId === userId);
  if (!member) return sectionId;
  return group.poolSectionId;
}

export async function shouldShowSharedItems(opts: {
  courseOfferingId: string;
  sectionId: string;
  userId: string;
  role: "ADMIN" | "PROFESSOR" | "CIDA";
}): Promise<{ show: boolean; poolSectionId: string | null }> {
  const group = await getActiveShareGroup(opts.courseOfferingId);
  if (!group || group.members.length < 2) {
    return { show: false, poolSectionId: null };
  }
  if (opts.role === "ADMIN") {
    const instructors = await prisma.sectionInstructor.findMany({
      where: { sectionId: opts.sectionId },
      select: { userId: true },
    });
    const memberIds = new Set(group.members.map((m) => m.userId));
    const sectionHasMember = instructors.some((i) => memberIds.has(i.userId));
    if (sectionHasMember || group.poolSectionId === opts.sectionId) {
      return { show: true, poolSectionId: group.poolSectionId };
    }
    return { show: false, poolSectionId: null };
  }
  if (group.members.some((m) => m.userId === opts.userId)) {
    return { show: true, poolSectionId: group.poolSectionId };
  }
  return { show: false, poolSectionId: null };
}

export async function loadCourseItemsForSection(opts: {
  sectionId: string;
  courseOfferingId: string;
  userId: string;
  role: "ADMIN" | "PROFESSOR" | "CIDA";
}) {
  const shared = await shouldShowSharedItems(opts);
  const targetId = shared.show && shared.poolSectionId
    ? shared.poolSectionId
    : opts.sectionId;
  return prisma.courseItem.findMany({
    where: { sectionId: targetId },
    orderBy: [{ sortOrder: "asc" }, { number: "asc" }],
    include: courseItemInclude,
  });
}

async function facultyOnOffering(courseOfferingId: string) {
  const rows = await prisma.sectionInstructor.findMany({
    where: { section: { courseOfferingId } },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  const byId = new Map<string, { id: string; name: string | null; email: string | null }>();
  for (const r of rows) {
    byId.set(r.user.id, r.user);
  }
  return [...byId.values()];
}

async function sectionsForUserOnOffering(userId: string, courseOfferingId: string) {
  return prisma.section.findMany({
    where: {
      courseOfferingId,
      instructors: { some: { userId } },
    },
    orderBy: { sortOrder: "asc" },
    select: { id: true, label: true },
  });
}

async function nextNumber(sectionId: string, itemTypeId: string): Promise<number> {
  const agg = await prisma.courseItem.aggregate({
    where: { sectionId, itemTypeId },
    _max: { number: true },
  });
  return (agg._max.number ?? 0) + 1;
}

async function moveItemsToPool(fromSectionId: string, poolSectionId: string) {
  if (fromSectionId === poolSectionId) return;
  const items = await prisma.courseItem.findMany({
    where: { sectionId: fromSectionId },
    orderBy: [{ itemTypeId: "asc" }, { number: "asc" }],
  });
  for (const item of items) {
    const number = await nextNumber(poolSectionId, item.itemTypeId);
    await prisma.courseItem.update({
      where: { id: item.id },
      data: { sectionId: poolSectionId, number, sortOrder: number },
    });
  }
}

async function cloneItemsToSection(sourceSectionId: string, targetSectionId: string) {
  if (sourceSectionId === targetSectionId) return;
  await prisma.courseItem.deleteMany({ where: { sectionId: targetSectionId } });
  const items = await prisma.courseItem.findMany({
    where: { sectionId: sourceSectionId },
    include: { codes: true },
    orderBy: [{ itemTypeId: "asc" }, { number: "asc" }],
  });
  for (const item of items) {
    await prisma.courseItem.create({
      data: {
        sectionId: targetSectionId,
        itemTypeId: item.itemTypeId,
        number: item.number,
        title: item.title,
        sortOrder: item.sortOrder,
        oneDriveUrl: item.oneDriveUrl,
        linkTitle: item.linkTitle,
        onSiteDisplay: item.onSiteDisplay,
        codes: item.codes.length
          ? {
              create: item.codes.map((c) => ({ codeNumberId: c.codeNumberId })),
            }
          : undefined,
      },
    });
  }
}

export async function requestCourseShare(opts: {
  actor: Actor;
  sectionId: string;
}) {
  const section = await prisma.section.findUnique({
    where: { id: opts.sectionId },
    select: { id: true, courseOfferingId: true },
  });
  if (!section) {
    throw new Error("not_found");
  }

  const faculty = await facultyOnOffering(section.courseOfferingId);
  const others = faculty.filter((f) => f.id !== opts.actor.id);
  if (others.length === 0) {
    throw new Error("no_peers");
  }

  let group = await getActiveShareGroup(section.courseOfferingId);
  if (!group) {
    group = await prisma.courseShareGroup.create({
      data: {
        courseOfferingId: section.courseOfferingId,
        poolSectionId: section.id,
        members: { create: { userId: opts.actor.id } },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        requests: {
          where: { status: "PENDING" },
          include: {
            target: { select: { id: true, name: true, email: true } },
            requester: { select: { id: true, name: true, email: true } },
          },
        },
        poolSection: { select: { id: true, label: true } },
      },
    });
  } else {
    const already = group.members.some((m) => m.userId === opts.actor.id);
    if (!already && group.members.length >= 2) {
      throw new Error("already_shared_join_via_invite");
    }
    if (!already) {
      await prisma.courseShareMember.create({
        data: { shareGroupId: group.id, userId: opts.actor.id },
      });
    }
  }

  const existingPending = await prisma.courseShareRequest.findMany({
    where: {
      courseOfferingId: section.courseOfferingId,
      status: "PENDING",
    },
    select: { targetUserId: true },
  });
  const pendingTargets = new Set(existingPending.map((r) => r.targetUserId));
  const memberIds = new Set(
    (await prisma.courseShareMember.findMany({
      where: { shareGroupId: group.id },
      select: { userId: true },
    })).map((m) => m.userId)
  );

  const targets = others.filter(
    (f) => !memberIds.has(f.id) && !pendingTargets.has(f.id)
  );
  if (targets.length === 0 && group.members.length < 2) {
    throw new Error("pending_already");
  }

  const path = await offeringPath(section.courseOfferingId);
  const who = actorLabel(opts.actor);
  let created = 0;
  for (const target of targets) {
    const row = await prisma.courseShareRequest.create({
      data: {
        courseOfferingId: section.courseOfferingId,
        shareGroupId: group.id,
        requesterUserId: opts.actor.id,
        targetUserId: target.id,
      },
    });
    created += 1;
    await createNotifications({
      userIds: [target.id],
      kind: "SHARE_REQUEST",
      href: "/inbox",
      payload: { requestId: row.id },
      copy: {
        titleEn: "Course sharing request",
        titleKo: "과목 공유 요청",
        bodyEn: `${who} wants to share assignments, quizzes, and exams for ${path}. Open the inbox to accept or decline.`,
        bodyKo: `${who} 님이 ${path}의 과제·퀴즈·시험 공유를 요청했습니다. 메시지함에서 수락 또는 거절하세요.`,
      },
    });
  }

  await logActivity(
    opts.actor,
    `${who} requested sharing for ${path}`,
    `${who} 님이 ${path} 공유를 요청했습니다`
  );

  return { created, path };
}

export async function respondToShareRequest(opts: {
  actor: Actor;
  requestId: string;
  accept: boolean;
}) {
  const req = await prisma.courseShareRequest.findUnique({
    where: { id: opts.requestId },
  });
  if (!req || req.targetUserId !== opts.actor.id) {
    throw new Error("not_found");
  }
  if (req.status !== "PENDING") {
    throw new Error("not_pending");
  }

  const path = await offeringPath(req.courseOfferingId);
  const who = actorLabel(opts.actor);

  if (!opts.accept) {
    await prisma.courseShareRequest.update({
      where: { id: req.id },
      data: { status: "DECLINED", respondedAt: new Date() },
    });
    await createNotifications({
      userIds: [req.requesterUserId],
      kind: "SHARE_DECLINED",
      href: "/inbox",
      copy: {
        titleEn: "Sharing declined",
        titleKo: "공유가 거절되었습니다",
        bodyEn: `${who} declined sharing for ${path}.`,
        bodyKo: `${who} 님이 ${path} 공유를 거절했습니다.`,
      },
    });
    await logActivity(
      opts.actor,
      `${who} declined sharing for ${path}`,
      `${who} 님이 ${path} 공유를 거절했습니다`
    );
    return { accepted: false };
  }

  let group = req.shareGroupId
    ? await prisma.courseShareGroup.findUnique({
        where: { id: req.shareGroupId },
      })
    : await getActiveShareGroup(req.courseOfferingId);

  if (!group) {
    const requesterSections = await sectionsForUserOnOffering(
      req.requesterUserId,
      req.courseOfferingId
    );
    const poolSectionId = requesterSections[0]?.id;
    if (!poolSectionId) {
      throw new Error("no_pool");
    }
    group = await prisma.courseShareGroup.create({
      data: {
        courseOfferingId: req.courseOfferingId,
        poolSectionId,
        members: { create: { userId: req.requesterUserId } },
      },
    });
  }

  const already = await prisma.courseShareMember.findUnique({
    where: {
      shareGroupId_userId: { shareGroupId: group.id, userId: opts.actor.id },
    },
  });
  if (!already) {
    await prisma.courseShareMember.create({
      data: { shareGroupId: group.id, userId: opts.actor.id },
    });
  }

  const joinerSections = await sectionsForUserOnOffering(
    opts.actor.id,
    req.courseOfferingId
  );
  for (const sec of joinerSections) {
    await moveItemsToPool(sec.id, group.poolSectionId);
  }

  await prisma.courseShareRequest.update({
    where: { id: req.id },
    data: { status: "ACCEPTED", respondedAt: new Date(), shareGroupId: group.id },
  });

  const members = await prisma.courseShareMember.findMany({
    where: { shareGroupId: group.id },
    select: { userId: true },
  });
  const others = members.map((m) => m.userId).filter((id) => id !== opts.actor.id);

  await createNotifications({
    userIds: others,
    kind: "SHARE_ACCEPTED",
    href: "/teach",
    copy: {
      titleEn: "Sharing accepted",
      titleKo: "공유가 수락되었습니다",
      bodyEn: `${who} accepted sharing for ${path}. Those sections now share one item list.`,
      bodyKo: `${who} 님이 ${path} 공유를 수락했습니다. 해당 섹션의 항목이 하나로 공유됩니다.`,
    },
  });
  await logActivity(
    opts.actor,
    `${who} accepted sharing for ${path}`,
    `${who} 님이 ${path} 공유를 수락했습니다`
  );
  return { accepted: true };
}

export async function leaveCourseShare(opts: {
  actor: Actor;
  courseOfferingId: string;
}) {
  const group = await getActiveShareGroup(opts.courseOfferingId);
  if (!group) {
    throw new Error("not_sharing");
  }
  const isMember = group.members.some((m) => m.userId === opts.actor.id);
  if (!isMember) {
    throw new Error("not_sharing");
  }

  const path = await offeringPath(opts.courseOfferingId);
  const who = actorLabel(opts.actor);
  const remaining = group.members.filter((m) => m.userId !== opts.actor.id);
  const leaverSections = await sectionsForUserOnOffering(
    opts.actor.id,
    opts.courseOfferingId
  );
  const poolOwnedByLeaver = leaverSections.some((s) => s.id === group.poolSectionId);

  if (remaining.length < 2) {
    for (const member of remaining) {
      const secs = await sectionsForUserOnOffering(member.userId, opts.courseOfferingId);
      for (const sec of secs) {
        await cloneItemsToSection(group.poolSectionId, sec.id);
      }
    }
    for (const sec of leaverSections) {
      await cloneItemsToSection(group.poolSectionId, sec.id);
    }
    await prisma.courseShareRequest.updateMany({
      where: { shareGroupId: group.id, status: "PENDING" },
      data: { status: "CANCELLED", respondedAt: new Date() },
    });
    await prisma.courseShareGroup.delete({ where: { id: group.id } });
  } else if (poolOwnedByLeaver) {
    const newOwner = remaining[0]!;
    const newOwnerSecs = await sectionsForUserOnOffering(
      newOwner.userId,
      opts.courseOfferingId
    );
    const newPoolId = newOwnerSecs[0]?.id;
    if (!newPoolId) {
      throw new Error("no_pool");
    }
    await cloneItemsToSection(group.poolSectionId, newPoolId);
    for (const sec of leaverSections) {
      if (sec.id !== group.poolSectionId) {
        await cloneItemsToSection(group.poolSectionId, sec.id);
      }
    }
    await prisma.courseShareGroup.update({
      where: { id: group.id },
      data: { poolSectionId: newPoolId },
    });
    await prisma.courseShareMember.delete({
      where: {
        shareGroupId_userId: { shareGroupId: group.id, userId: opts.actor.id },
      },
    });
  } else {
    for (const sec of leaverSections) {
      await cloneItemsToSection(group.poolSectionId, sec.id);
    }
    await prisma.courseShareMember.delete({
      where: {
        shareGroupId_userId: { shareGroupId: group.id, userId: opts.actor.id },
      },
    });
  }

  const notifyIds = remaining.map((m) => m.userId);
  await createNotifications({
    userIds: notifyIds,
    kind: "SHARE_ENDED",
    href: "/inbox",
    copy: {
      titleEn: "Sharing ended",
      titleKo: "공유가 해제되었습니다",
      bodyEn: `${who} stopped sharing ${path}. Each faculty keeps the items as they were at that moment, then updates independently.`,
      bodyKo: `${who} 님이 ${path} 공유를 해제했습니다. 해제 시점의 항목은 그대로 유지되고, 이후부터는 각자 수정합니다.`,
    },
  });
  await logActivity(
    opts.actor,
    `${who} stopped sharing ${path}`,
    `${who} 님이 ${path} 공유를 해제했습니다`
  );
}

export async function shareStateForSection(opts: {
  sectionId: string;
  userId: string;
  role: "ADMIN" | "PROFESSOR" | "CIDA";
}) {
  const section = await prisma.section.findUnique({
    where: { id: opts.sectionId },
    select: { courseOfferingId: true },
  });
  if (!section) return null;

  const [group, faculty, incoming] = await Promise.all([
    getActiveShareGroup(section.courseOfferingId),
    facultyOnOffering(section.courseOfferingId),
    prisma.courseShareRequest.findMany({
      where: {
        courseOfferingId: section.courseOfferingId,
        targetUserId: opts.userId,
        status: "PENDING",
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  const others = faculty.filter((f) => f.id !== opts.userId);
  const isMember = !!group?.members.some((m) => m.userId === opts.userId);
  const active = !!group && group.members.length >= 2 && isMember;

  return {
    courseOfferingId: section.courseOfferingId,
    active,
    isMember,
    canRequest: others.length > 0 && opts.role !== "CIDA",
    poolSectionLabel: group?.poolSection.label ?? null,
    members: (group?.members ?? []).map((m) => ({
      id: m.user.id,
      label: listUserLabel(m.user.name, m.user.email),
    })),
    otherFaculty: others.map((f) => ({
      id: f.id,
      label: listUserLabel(f.name, f.email),
    })),
    pendingOutgoing: (group?.requests ?? [])
      .filter((r) => r.requesterUserId === opts.userId)
      .map((r) => ({
        id: r.id,
        targetLabel: listUserLabel(r.target.name, r.target.email),
      })),
    pendingIncoming: incoming.map((r) => ({
      id: r.id,
      requesterLabel: listUserLabel(r.requester.name, r.requester.email),
    })),
  };
}

export async function reassignPoolIfDeleted(deletedSectionId: string) {
  const groups = await prisma.courseShareGroup.findMany({
    where: { poolSectionId: deletedSectionId },
    include: { members: true },
  });
  for (const group of groups) {
    const alt = await prisma.section.findFirst({
      where: {
        courseOfferingId: group.courseOfferingId,
        id: { not: deletedSectionId },
        instructors: {
          some: { userId: { in: group.members.map((m) => m.userId) } },
        },
      },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });
    if (!alt) {
      await prisma.courseShareGroup.delete({ where: { id: group.id } });
      continue;
    }
    await moveItemsToPool(deletedSectionId, alt.id);
    await prisma.courseShareGroup.update({
      where: { id: group.id },
      data: { poolSectionId: alt.id },
    });
  }
}
