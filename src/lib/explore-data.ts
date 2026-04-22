import { prisma } from "@/lib/prisma";
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
          codes: { orderBy: { code: "asc" } },
        },
      },
    },
  });

  return sections.map((sec) => {
    const y = sec.courseOffering.term.academicYear.label;
    const tr = sec.courseOffering.term.termSeason.label;
    const c = sec.courseOffering.course.name;
    const pathLabel = `${y} · ${tr} · ${c} · Sec ${sec.label}`;
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
        codes: it.codes.map((x) => x.code),
        oneDriveUrl: it.oneDriveUrl,
        linkTitle: it.linkTitle,
        title: it.title,
      })),
    };
  });
});
