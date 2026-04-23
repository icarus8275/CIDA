import type { ExploreCourse } from "./explore-data";
import { listUserLabel } from "./user-display";

export type CodeRef = {
  code: string;
  course: string;
  courseId: string;
  pathLabel: string;
  type: string;
  number: number;
  itemId: string;
  itemTypeId: string;
  /** 섹션 담당 교수(표시용 문장) */
  instructorsLabel: string;
};

function formatInstructors(course: ExploreCourse): string {
  if (!course.instructors || course.instructors.length === 0) {
    return "";
  }
  return course.instructors
    .map((i) => listUserLabel(i.name, i.email))
    .filter((s) => s && s !== "—")
    .join(", ");
}

export function buildCodeIndex(
  data: ExploreCourse[]
): Map<string, CodeRef[]> {
  const map = new Map<string, CodeRef[]>();
  for (const course of data) {
    const instructorsLabel = formatInstructors(course);
    for (const it of course.items) {
      for (const code of it.codes) {
        const raw = typeof code === "string" ? code : code.value;
        const upper = raw.toUpperCase();
        const list = map.get(upper) ?? [];
        list.push({
          code: upper,
          course: course.name,
          courseId: course.id,
          pathLabel: course.pathLabel,
          type: it.typeLabel,
          number: it.number,
          itemId: it.id,
          itemTypeId: it.itemTypeId,
          instructorsLabel,
        });
        map.set(upper, list);
      }
    }
  }
  return map;
}
