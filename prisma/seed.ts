import "dotenv/config";
import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import { hashPassword } from "../src/lib/password";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL required for seed");

const pool = new pg.Pool({ connectionString: url });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function stableId(prefix: string, input: string) {
  return `${prefix}_${createHash("sha256").update(input).digest("hex").slice(0, 24)}`;
}

async function main() {
  const types = [
    { key: "assignment", label: "Assignment" },
    { key: "project", label: "Project" },
    { key: "exam", label: "Exam" },
    { key: "quiz", label: "Quiz" },
  ] as const;

  const tMap: Record<string, string> = {};
  for (let i = 0; i < types.length; i++) {
    const t = await prisma.itemTypeDefinition.upsert({
      where: { key: types[i].key },
      create: { key: types[i].key, label: types[i].label, sortOrder: i },
      update: { label: types[i].label, sortOrder: i },
    });
    tMap[types[i].key] = t.id;
  }

  const seasonFall = await prisma.termSeason.upsert({
    where: { key: "fall" },
    create: { key: "fall", label: "Fall Semester", sortOrder: 0 },
    update: { label: "Fall Semester" },
  });
  const seasonSpring = await prisma.termSeason.upsert({
    where: { key: "spring" },
    create: { key: "spring", label: "Spring Semester", sortOrder: 1 },
    update: { label: "Spring Semester" },
  });
  await prisma.termSeason.upsert({
    where: { key: "summer" },
    create: { key: "summer", label: "Summer Semester", sortOrder: 2 },
    update: { label: "Summer Semester" },
  });

  const year = await prisma.academicYear.upsert({
    where: { id: stableId("ay", "2024-2025") },
    create: {
      id: stableId("ay", "2024-2025"),
      label: "2024–2025",
      startYear: 2024,
      sortOrder: 0,
    },
    update: { label: "2024–2025" },
  });

  const term = await prisma.term.upsert({
    where: {
      academicYearId_termSeasonId: {
        academicYearId: year.id,
        termSeasonId: seasonFall.id,
      },
    },
    create: {
      academicYearId: year.id,
      termSeasonId: seasonFall.id,
      sortOrder: 0,
    },
    update: {},
  });

  const c314 = await prisma.course.upsert({
    where: { id: stableId("c", "IDES 314") },
    create: {
      id: stableId("c", "IDES 314"),
      name: "IDES 314 Lighting Technology 1",
      sortOrder: 0,
    },
    update: { name: "IDES 314 Lighting Technology 1" },
  });
  const c315 = await prisma.course.upsert({
    where: { id: stableId("c", "IDES 315") },
    create: {
      id: stableId("c", "IDES 315"),
      name: "IDES 315 Lighting Technology 2",
      sortOrder: 1,
    },
    update: { name: "IDES 315 Lighting Technology 2" },
  });

  const off314 = await prisma.courseOffering.upsert({
    where: {
      courseId_termId: { courseId: c314.id, termId: term.id },
    },
    create: {
      courseId: c314.id,
      termId: term.id,
      sortOrder: 0,
    },
    update: {},
  });
  const off315 = await prisma.courseOffering.upsert({
    where: {
      courseId_termId: { courseId: c315.id, termId: term.id },
    },
    create: {
      courseId: c315.id,
      termId: term.id,
      sortOrder: 1,
    },
    update: {},
  });

  const sec314 = await prisma.section.upsert({
    where: { id: stableId("sec", `${off314.id}-001`) },
    create: {
      id: stableId("sec", `${off314.id}-001`),
      courseOfferingId: off314.id,
      label: "001",
      sortOrder: 0,
    },
    update: {},
  });
  const sec315 = await prisma.section.upsert({
    where: { id: stableId("sec", `${off315.id}-001`) },
    create: {
      id: stableId("sec", `${off315.id}-001`),
      courseOfferingId: off315.id,
      label: "001",
      sortOrder: 0,
    },
    update: {},
  });

  const seedItem = async (
    sectionId: string,
    typeKey: "assignment" | "project" | "exam" | "quiz",
    number: number,
    codes: string[]
  ) => {
    const typeId = tMap[typeKey]!;
    const id = stableId("ci", `${sectionId}|${typeKey}|${number}`);
    const item = await prisma.courseItem.upsert({
      where: {
        sectionId_itemTypeId_number: {
          sectionId,
          itemTypeId: typeId,
          number,
        },
      },
      create: {
        id,
        sectionId,
        itemTypeId: typeId,
        number,
        sortOrder: number,
      },
      update: { sortOrder: number },
    });
    await prisma.courseItemCode.deleteMany({ where: { courseItemId: item.id } });
    await prisma.courseItemCode.createMany({
      data: codes.map((c) => ({ courseItemId: item.id, code: c.toUpperCase() })),
    });
  };

  await seedItem(sec314.id, "assignment", 1, ["6A", "6B", "6C"]);
  await seedItem(sec314.id, "project", 1, ["2A", "2B", "3D"]);
  await seedItem(sec314.id, "exam", 1, ["4A", "5A", "6A"]);
  await seedItem(sec314.id, "exam", 2, ["4A", "5A", "6B"]);

  await seedItem(sec315.id, "assignment", 1, ["7A", "7B", "6C"]);
  await seedItem(sec315.id, "project", 1, ["1A", "7B", "5D"]);
  await seedItem(sec315.id, "exam", 1, ["13A", "12A", "6A"]);
  await seedItem(sec315.id, "exam", 2, ["7A", "8A", "6B"]);

  const adminEmail =
    process.env.AUTH_DEV_EMAIL || process.env.SEED_ADMIN_EMAIL || "jjson@bsu.edu";
  const adminPass = process.env.AUTH_DEV_PASSWORD || process.env.SEED_ADMIN_PASSWORD || "Idbehappy2live!";
  const hash = await hashPassword(adminPass);

  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: "Admin",
      role: "ADMIN",
      passwordHash: hash,
      emailVerified: new Date(),
    },
    update: { passwordHash: hash, role: "ADMIN" },
  });

  console.log(
    `Seed done. Admin: ${adminEmail} / (password from AUTH_DEV_PASSWORD or SEED_ADMIN_PASSWORD, default changeme)`
  );
}

main()
  .then(() => pool.end())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
