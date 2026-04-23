import type { ExploreCourse } from "./explore-data";

export type CodeRef = {
  code: string;
  course: string;
  courseId: string;
  pathLabel: string;
  type: string;
  number: number;
  itemId: string;
  itemTypeId: string;
};

export function buildCodeIndex(
  data: ExploreCourse[]
): Map<string, CodeRef[]> {
  const map = new Map<string, CodeRef[]>();
  for (const course of data) {
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
        });
        map.set(upper, list);
      }
    }
  }
  return map;
}
