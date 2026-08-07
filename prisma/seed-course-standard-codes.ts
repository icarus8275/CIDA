import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import {
  COURSE_STANDARD_CODES,
  idesNumberFromCourseName,
} from "./seed-course-standard-codes-data";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL required");

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
