/** Read-only check: seed map vs DB courses & code catalog. */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import { COURSE_STANDARD_CODES, idesNumberFromCourseName } from "./seed-course-standard-codes-data";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");

  const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 15_000 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const [courses, codeRows] = await Promise.all([
      prisma.course.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          courseCodes: {
            include: { codeNumber: { select: { value: true, isActive: true } } },
          },
        },
      }),
      prisma.codeNumber.findMany({
        select: { id: true, value: true, isActive: true },
      }),
    ]);

    const valueToRow = new Map(
      codeRows.map((c) => [c.value.trim().toUpperCase(), c])
    );

    const byNumber = new Map<number, typeof courses>();
    for (const course of courses) {
      const n = idesNumberFromCourseName(course.name);
      if (n == null) continue;
      const list = byNumber.get(n) ?? [];
      list.push(course);
      byNumber.set(n, list);
    }

    const missingInCatalog = new Set<string>();
    for (const values of Object.values(COURSE_STANDARD_CODES)) {
      for (const v of values) {
        if (!valueToRow.has(v.toUpperCase())) {
          missingInCatalog.add(v.toUpperCase());
        }
      }
    }

    const noCourseInDb: string[] = [];
    for (const n of Object.keys(COURSE_STANDARD_CODES).map(Number)) {
      if (!byNumber.get(n)?.length) {
        noCourseInDb.push(`IDES ${n}`);
      }
    }

    const inDbNotInSeed: string[] = [];
    for (const course of courses) {
      const n = idesNumberFromCourseName(course.name);
      if (n == null) {
        inDbNotInSeed.push(`${course.name} (IDES 번호 없음)`);
      } else if (!(n in COURSE_STANDARD_CODES)) {
        inDbNotInSeed.push(course.name);
      }
    }

    const wrongSaved: {
      course: string;
      missing: string[];
      extra: string[];
    }[] = [];
    for (const [nStr, expected] of Object.entries(COURSE_STANDARD_CODES)) {
      const n = parseInt(nStr, 10);
      for (const course of byNumber.get(n) ?? []) {
        const saved = new Set(
          course.courseCodes.map((cc) => cc.codeNumber.value.toUpperCase())
        );
        const exp = new Set(expected.map((v) => v.toUpperCase()));
        const missing = [...exp].filter((v) => !saved.has(v));
        const extra = [...saved].filter((v) => !exp.has(v));
        if (missing.length || extra.length) {
          wrongSaved.push({ course: course.name, missing, extra });
        }
      }
    }

    const allSeedCodes = new Set(
      Object.values(COURSE_STANDARD_CODES)
        .flat()
        .map((v) => v.toUpperCase())
    );
    const inactiveCodesUsed = [...allSeedCodes].filter((v) => {
      const row = valueToRow.get(v);
      return row && !row.isActive;
    });

    const catalogNotUsed = codeRows
      .filter((c) => c.isActive)
      .map((c) => c.value.toUpperCase())
      .filter((v) => {
        for (const list of Object.values(COURSE_STANDARD_CODES)) {
          if (list.some((x) => x.toUpperCase() === v)) return false;
        }
        return true;
      });

    console.log(JSON.stringify(
      {
        totalCoursesInDb: courses.length,
        seedCourseCount: Object.keys(COURSE_STANDARD_CODES).length,
        matchedAndSaved: courses.filter((c) => {
          const n = idesNumberFromCourseName(c.name);
          return n != null && n in COURSE_STANDARD_CODES && c.courseCodes.length > 0;
        }).length,
        missingInCatalog: [...missingInCatalog].sort(),
        noCourseInDb,
        inDbNotInSeed,
        wrongSaved,
        inactiveCodesUsed: inactiveCodesUsed.sort(),
      },
      null,
      2
    ));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
