import { prisma } from "@/lib/prisma";
import { cache } from "react";

export type ExploreItem = {
  id: string;
  itemTypeId: string;
  typeLabel: string;
  typeKey: string;
  number: number;
  codes: string[];
};

export type ExploreCourse = {
  id: string;
  name: string;
  items: ExploreItem[];
};

export const getExploreData = cache(async (): Promise<ExploreCourse[]> => {
  const courses = await prisma.course.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        orderBy: [{ sortOrder: "asc" }, { number: "asc" }],
        include: {
          itemType: true,
          codes: { orderBy: { code: "asc" } },
        },
      },
    },
  });
  return courses.map((c) => ({
    id: c.id,
    name: c.name,
    items: c.items.map((it) => ({
      id: it.id,
      itemTypeId: it.itemTypeId,
      typeLabel: it.itemType.label,
      typeKey: it.itemType.key,
      number: it.number,
      codes: it.codes.map((x) => x.code),
    })),
  }));
});
