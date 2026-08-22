import { formatTermForDisplay } from "@/lib/term-display";
import { prisma } from "@/lib/prisma";

export async function describeSectionPath(sectionId: string): Promise<string | null> {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: {
      courseOffering: {
        include: {
          course: true,
          term: { include: { academicYear: true, termSeason: true } },
        },
      },
    },
  });
  if (!section) return null;
  const term = formatTermForDisplay(section.courseOffering.term);
  return `${term} · ${section.courseOffering.course.name} · Sec ${section.label}`;
}

export async function describeCourseItem(itemId: string): Promise<{
  itemLabel: string;
  path: string;
} | null> {
  const item = await prisma.courseItem.findUnique({
    where: { id: itemId },
    include: {
      itemType: true,
      section: {
        include: {
          courseOffering: {
            include: {
              course: true,
              term: { include: { academicYear: true, termSeason: true } },
            },
          },
        },
      },
    },
  });
  if (!item) return null;
  const title = item.title?.trim();
  const itemLabel = title
    ? `${item.itemType.label} ${item.number} (${title})`
    : `${item.itemType.label} ${item.number}`;
  const term = formatTermForDisplay(item.section.courseOffering.term);
  const path = `${term} · ${item.section.courseOffering.course.name} · Sec ${item.section.label}`;
  return { itemLabel, path };
}
