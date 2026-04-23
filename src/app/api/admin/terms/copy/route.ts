import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { NextResponse } from "next/server";

const postSchema = z.object({
  sourceTermId: z.string().min(1),
  targetTermId: z.string().min(1),
});

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = postSchema.parse(await req.json());
  if (body.sourceTermId === body.targetTermId) {
    return NextResponse.json(
      { error: "same_term", message: "Source and target must differ." },
      { status: 400 }
    );
  }

  const [source, target] = await Promise.all([
    prisma.term.findUnique({
      where: { id: body.sourceTermId },
      include: {
        offerings: {
          orderBy: { sortOrder: "asc" },
          include: {
            course: { select: { id: true, name: true } },
            sections: {
              orderBy: { sortOrder: "asc" },
              include: {
                instructors: true,
                courseItems: {
                  orderBy: { sortOrder: "asc" },
                  include: { codes: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.term.findUnique({ where: { id: body.targetTermId } }),
  ]);

  if (!source || !target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const skippedCourses: string[] = [];
  let copiedOfferings = 0;

  await prisma.$transaction(async (tx) => {
    for (const off of source.offerings) {
      const existing = await tx.courseOffering.findUnique({
        where: {
          courseId_termId: {
            courseId: off.courseId,
            termId: body.targetTermId,
          },
        },
      });
      if (existing) {
        skippedCourses.push(off.course.name);
        continue;
      }

      const newOff = await tx.courseOffering.create({
        data: {
          courseId: off.courseId,
          termId: body.targetTermId,
          sortOrder: off.sortOrder,
        },
      });
      copiedOfferings += 1;

      for (const sec of off.sections) {
        const newSec = await tx.section.create({
          data: {
            courseOfferingId: newOff.id,
            label: sec.label,
            sortOrder: sec.sortOrder,
          },
        });
        for (const ins of sec.instructors) {
          await tx.sectionInstructor.create({
            data: { userId: ins.userId, sectionId: newSec.id },
          });
        }
        for (const item of sec.courseItems) {
          const newItem = await tx.courseItem.create({
            data: {
              sectionId: newSec.id,
              itemTypeId: item.itemTypeId,
              number: item.number,
              title: item.title,
              sortOrder: item.sortOrder,
              oneDriveUrl: item.oneDriveUrl,
              linkTitle: item.linkTitle,
            },
          });
          for (const link of item.codes) {
            await tx.courseItemCode.create({
              data: {
                courseItemId: newItem.id,
                codeNumberId: link.codeNumberId,
              },
            });
          }
        }
      }
    }
  });

  revalidatePath("/teach");
  revalidatePath("/teach", "layout");
  revalidatePath("/explore");
  revalidatePath("/explore", "layout");
  revalidatePath("/admin/schedule");

  return NextResponse.json({
    ok: true,
    copiedOfferings,
    skippedOfferings: skippedCourses.length,
    skippedCourses,
  });
}
