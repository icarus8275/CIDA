/**
 * One-time / repeatable seed: course standard codes (CourseCode) per IDES catalog course.
 * Run: npx tsx prisma/seed-course-standard-codes.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL required");

/** IDES number → standard code values (uppercase). */
const COURSE_STANDARD_CODES: Record<number, string[]> = {
  100: ["4D", "5A", "5B", "5C", "6A", "6B", "6C", "6J", "6M", "6N", "6O", "9G", "10A", "10C", "10D", "10E", "10F", "10G", "15A"],
  101: ["9D", "11D", "12G", "12I"],
  113: ["4A", "4B", "4D", "10A", "10B", "10C", "10E", "10F", "10G"],
  116: ["5E", "6J", "8A", "8E", "8F", "8G", "8K", "9D", "11A", "11B", "11C", "11D", "12F", "12H"],
  117: ["8A", "8E", "8F", "9B", "9C", "9D", "9E", "12H", "12I", "15I"],
  120: ["11B", "11C"],
  200: ["4E", "6A", "6B", "6C", "6D", "6E", "6F", "6H", "6I", "6K", "6L"],
  215: ["12I", "13A", "13B", "13C", "13D", "13E", "13F", "14F", "16C"],
  221: ["5D", "9F"],
  222: ["7A", "7B", "7F", "8C", "8F", "8H", "9A", "9B", "9C", "11B", "11C", "11D"],
  224: ["8A", "8C", "8H", "8J", "9E", "12D", "12E", "14D", "15G"],
  228: ["5D", "11A", "12A", "12B", "12C"],
  261: ["4E", "4F", "7A", "7E", "7F", "8J", "16A", "16D", "16E", "16I"],
  312: ["4B", "14E", "14F", "15A", "16B", "16C"],
  314: ["9F", "12A", "12B", "12C", "12D", "12E", "12F", "12G", "12H", "14A", "14B"],
  315: ["12A", "12B", "12C", "12D", "12E", "12F", "14A", "14B", "14C", "15F"],
  324: ["4C", "4F", "5A", "5B", "5E", "5F", "6K", "6O", "6P", "8H", "13F", "15E", "16G", "16H"],
  325: ["8I", "13F", "14C", "14D", "14E", "14F", "15A", "15B", "15C", "15D", "15E", "15G", "16C", "16D", "16E", "16F"],
  327: ["4E", "6D", "6G", "9G", "14E", "15C", "15D", "15H", "15I", "15J", "16E", "16F"],
  334: ["4C", "4F", "5C", "5F", "6G", "6P", "8B", "8D", "8G", "12D", "13E", "15B", "16B"],
  362: ["14A", "14B", "14C", "14D", "15B", "15F", "15G", "15I", "16A", "16D", "16F", "16G", "16H", "16I"],
  369: ["5F", "6E", "6F", "6H", "6I", "6K", "6M", "6O", "15J"],
  400: ["4A", "5A", "6A", "6D", "6E", "6F", "6G", "6H", "6L", "6N", "16G", "16H", "16I"],
  420: ["7A", "7B", "7C", "7D", "8C", "8D", "8E", "8I", "9A"],
  421: ["7E", "10B", "10D", "10G", "13A", "13B", "13C", "13D", "13E", "13F", "15D", "15E"],
  424: ["4C", "5B", "7B", "7C", "7D", "7E", "7F", "8B", "8D", "8I", "9A", "15E", "15J", "16D"],
  484: ["7C", "7D", "8B", "8D", "8G", "8K", "9B", "9C", "9E", "15C", "15H"],
};

function idesNumberFromCourseName(name: string): number | null {
  const m = name.trim().match(/^IDES\s+(\d+)\b/i);
  if (!m) return null;
  return parseInt(m[1]!, 10);
}

async function main() {
  const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 15_000 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const [courses, codeRows] = await Promise.all([
      prisma.course.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.codeNumber.findMany({ select: { id: true, value: true } }),
    ]);

    const valueToId = new Map<string, string>();
    for (const c of codeRows) {
      valueToId.set(c.value.trim().toUpperCase(), c.id);
    }

    const byNumber = new Map<number, typeof courses>();
    for (const course of courses) {
      const n = idesNumberFromCourseName(course.name);
      if (n == null) continue;
      const list = byNumber.get(n) ?? [];
      list.push(course);
      byNumber.set(n, list);
    }

    let updated = 0;
    const unmatchedCourses: string[] = [];
    const missingCodes = new Set<string>();
    const ambiguous: string[] = [];

    for (const [numStr, values] of Object.entries(COURSE_STANDARD_CODES)) {
      const num = parseInt(numStr, 10);
      const matches = byNumber.get(num);
      if (!matches?.length) {
        unmatchedCourses.push(`IDES ${num} (no course in DB)`);
        continue;
      }
      if (matches.length > 1) {
        ambiguous.push(
          `IDES ${num}: ${matches.map((c) => c.name).join(" | ")}`
        );
      }

      const ids: string[] = [];
      for (const v of values) {
        const id = valueToId.get(v.toUpperCase());
        if (!id) missingCodes.add(v.toUpperCase());
        else ids.push(id);
      }
      const uniqueIds = [...new Set(ids)];

      for (const course of matches) {
        await prisma.$transaction(async (tx) => {
          await tx.courseCode.deleteMany({ where: { courseId: course.id } });
          if (uniqueIds.length) {
            await tx.courseCode.createMany({
              data: uniqueIds.map((codeNumberId) => ({
                courseId: course.id,
                codeNumberId,
              })),
            });
          }
          const allowed = new Set(uniqueIds);
          if (allowed.size === 0) {
            await tx.courseItemCode.deleteMany({
              where: {
                courseItem: {
                  section: { courseOffering: { courseId: course.id } },
                },
              },
            });
          } else {
            await tx.courseItemCode.deleteMany({
              where: {
                courseItem: {
                  section: { courseOffering: { courseId: course.id } },
                },
                codeNumberId: { notIn: [...allowed] },
              },
            });
          }
        });
        updated += 1;
        console.log(`✓ ${course.name}: ${values.join(", ")}`);
      }
    }

    const dbNumbers = new Set(
      courses
        .map((c) => idesNumberFromCourseName(c.name))
        .filter((n): n is number => n != null)
    );
    for (const n of dbNumbers) {
      if (!(n in COURSE_STANDARD_CODES)) {
        unmatchedCourses.push(
          `IDES ${n} in DB but not in seed map (${byNumber.get(n)?.map((c) => c.name).join(", ")})`
        );
      }
    }

    console.log("\n--- Summary ---");
    console.log(`Courses updated: ${updated}`);
    if (missingCodes.size) {
      console.log("Missing from CodeNumber catalog:", [...missingCodes].sort().join(", "));
    }
    if (unmatchedCourses.length) {
      console.log("Unmatched:");
      for (const u of unmatchedCourses) console.log("  -", u);
    }
    if (ambiguous.length) {
      console.log("Ambiguous (all got same codes):");
      for (const a of ambiguous) console.log("  -", a);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
