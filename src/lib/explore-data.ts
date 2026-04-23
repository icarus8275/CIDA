import { prisma } from "@/lib/prisma";
import { formatTermForDisplay } from "@/lib/term-display";
import { cache } from "react";

export type ExploreCode = {
  value: string;
  label: string | null;
};

export type ExploreItem = {
  id: string;
  itemTypeId: string;
  typeLabel: string;
  typeKey: string;
  number: number;
  codes: ExploreCode[];
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
  /** 섹션(Section)에 지정된 교수 */
  instructors: { name: string | null; email: string | null }[];
  items: ExploreItem[];
};

export type ExploreDataPayload = {
  courses: ExploreCourse[];
  /** value(대문자) → 관리자 설명 라벨 (툴팁) */
  codeLabels: Record<string, string | null>;
};

/**
 * Program-wide course–code tree: every section, every item (same view for CIDA, faculty, and admins).
 * Editing is still limited to assigned sections on /teach; Explore is read-only and shows the full program.
 */
export const getExploreData = cache(
  async (): Promise<ExploreDataPayload> => {
    const [sections, allCodeRows] = await Promise.all([
      prisma.section.findMany({
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
        instructors: { include: { user: { select: { name: true, email: true } } } },
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
    }),
      prisma.codeNumber.findMany({
        where: { isActive: true },
        select: { value: true, label: true },
      }),
    ]);

    const codeLabels: Record<string, string | null> = {};
    for (const cn of allCodeRows) {
      codeLabels[cn.value.trim().toUpperCase()] = cn.label;
    }

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
        instructors: sec.instructors.map((ins) => ({
          name: ins.user.name,
          email: ins.user.email,
        })),
        items: sec.courseItems.map((it) => ({
          id: it.id,
          itemTypeId: it.itemTypeId,
          typeLabel: it.itemType.label,
          typeKey: it.itemType.key,
          number: it.number,
          codes: it.codes.map((x) => ({
            value: x.codeNumber.value,
            label: x.codeNumber.label,
          })),
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
    return { courses: rows, codeLabels };
  }
);
