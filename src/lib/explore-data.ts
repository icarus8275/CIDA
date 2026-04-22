import { prisma } from "@/lib/prisma";
import { formatTermForDisplay } from "@/lib/term-display";
import { cache } from "react";

export type ExploreItem = {
  id: string;
  itemTypeId: string;
  typeLabel: string;
  typeKey: string;
  number: number;
  codes: string[];
  oneDriveUrl: string | null;
  linkTitle: string | null;
  title: string | null;
};

export type ExploreCourse = {
  id: string;
  name: string;
  pathLabel: string;
  items: ExploreItem[];
};

export const getExploreData = cache(async (): Promise<ExploreCourse[]> => {
  const sections = await prisma.section.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      courseOffering: {
        include: {
          course: true,
          term: {
            include: { academicYear: true, termSeason: true },
          },
        },
      },
      courseItems: {
        orderBy: [{ sortOrder: "asc" }, { number: "asc" }],
        include: {
          itemType: true,
          codes: {
            orderBy: { codeNumber: { value: "asc" } },
            include: { codeNumber: true },
          },
        },
      },
    },
  });

  return sections.map((sec) => {
    const term = sec.courseOffering.term;
    const c = sec.courseOffering.course.name;
    const pathLabel = `${formatTermForDisplay(term)} · ${c} · Sec ${sec.label}`;
    return {
      id: sec.id,
      name: `${c} — ${sec.label}`,
      pathLabel,
      items: sec.courseItems.map((it) => ({
        id: it.id,
        itemTypeId: it.itemTypeId,
        typeLabel: it.itemType.label,
        typeKey: it.itemType.key,
        number: it.number,
        codes: it.codes.map((x) => x.codeNumber.value),
        oneDriveUrl: it.oneDriveUrl,
        linkTitle: it.linkTitle,
        title: it.title,
      })),
    };
  });
});
