-- Course-level standard codes (admin-managed); replaces per-section SectionCode.
CREATE TABLE "CourseCode" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "codeNumberId" TEXT NOT NULL,

    CONSTRAINT "CourseCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseCode_courseId_codeNumberId_key" ON "CourseCode"("courseId", "codeNumberId");
CREATE INDEX "CourseCode_codeNumberId_idx" ON "CourseCode"("codeNumberId");

ALTER TABLE "CourseCode" ADD CONSTRAINT "CourseCode_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseCode" ADD CONSTRAINT "CourseCode_codeNumberId_fkey" FOREIGN KEY ("codeNumberId") REFERENCES "CodeNumber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "CourseCode" ("id", "courseId", "codeNumberId")
SELECT
  'cc' || REPLACE(GEN_RANDOM_UUID()::text, '-', ''),
  co."courseId",
  sc."codeNumberId"
FROM "SectionCode" sc
JOIN "Section" s ON s."id" = sc."sectionId"
JOIN "CourseOffering" co ON co."id" = s."courseOfferingId"
GROUP BY co."courseId", sc."codeNumberId";

DROP TABLE "SectionCode";
