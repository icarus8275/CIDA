import "dotenv/config";
import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";

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

  const seedItem = async (
    courseId: string,
    typeKey: "assignment" | "project" | "exam" | "quiz",
    number: number,
    codes: string[]
  ) => {
    const typeId = tMap[typeKey]!;
    const id = stableId("ci", `${courseId}|${typeKey}|${number}`);
    const item = await prisma.courseItem.upsert({
      where: {
        courseId_itemTypeId_number: { courseId, itemTypeId: typeId, number },
      },
      create: {
        id,
        courseId,
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

  await seedItem(c314.id, "assignment", 1, ["6A", "6B", "6C"]);
  await seedItem(c314.id, "project", 1, ["2A", "2B", "3D"]);
  await seedItem(c314.id, "exam", 1, ["4A", "5A", "6A"]);
  await seedItem(c314.id, "exam", 2, ["4A", "5A", "6B"]);

  await seedItem(c315.id, "assignment", 1, ["7A", "7B", "6C"]);
  await seedItem(c315.id, "project", 1, ["1A", "7B", "5D"]);
  await seedItem(c315.id, "exam", 1, ["13A", "12A", "6A"]);
  await seedItem(c315.id, "exam", 2, ["7A", "8A", "6B"]);

  console.log("Seed done: courses, item types, items, codes");
}

main()
  .then(() => pool.end())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
