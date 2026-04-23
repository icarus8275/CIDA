import { prisma } from "@/lib/prisma";
import { formatTermForDisplay } from "@/lib/term-display";
import { Prisma } from "@/generated/prisma/client";
import type { UserRole } from "@/generated/prisma/enums";
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
  /** 같은 학기(학기) 섹션끼리 그룹 */
  termId: string;
  termLabel: string;
  termSort: number;
  items: ExploreItem[];
};

/**
 * CIDA: 전체 카탈로그(읽기). ADMIN/PROFESSOR: SectionInstructor로 배정된 섹션만(강의/탐색 일치).
 */
export const getExploreData = cache(
  async (userId: string, role: UserRole): Promise<ExploreCourse[]> => {
    const where: Prisma.SectionWhereInput | undefined =
      role === "CIDA"
        ? undefined
        : { instructors: { some: { userId } } };

    const sections = await prisma.section.findMany({
      where,
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

    const rows = sections.map((sec) => {
      const term = sec.courseOffering.term;
      const c = sec.courseOffering.course.name;
      const pathLabel = `${formatTermForDisplay(term)} · ${c} · Sec ${sec.label}`;
      const y = term.academicYear.startYear ?? 0;
      const termSort = y * 10_000 + term.sortOrder;
      return {
        id: sec.id,
        name: `${c} — ${sec.label}`,
        pathLabel,
        termId: term.id,
        termLabel: formatTermForDisplay(term),
        termSort,
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
    rows.sort((a, b) => {
      if (a.termSort !== b.termSort) {
        return a.termSort - b.termSort;
      }
      return a.pathLabel.localeCompare(b.pathLabel, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
    return rows;
  }
);
