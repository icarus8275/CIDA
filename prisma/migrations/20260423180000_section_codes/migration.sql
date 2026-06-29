-- Section-level standard code picks; items may only assign from this subset.
CREATE TABLE "SectionCode" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "codeNumberId" TEXT NOT NULL,

    CONSTRAINT "SectionCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SectionCode_sectionId_codeNumberId_key" ON "SectionCode"("sectionId", "codeNumberId");
CREATE INDEX "SectionCode_codeNumberId_idx" ON "SectionCode"("codeNumberId");

ALTER TABLE "SectionCode" ADD CONSTRAINT "SectionCode_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SectionCode" ADD CONSTRAINT "SectionCode_codeNumberId_fkey" FOREIGN KEY ("codeNumberId") REFERENCES "CodeNumber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: union of codes already used on items in each section
INSERT INTO "SectionCode" ("id", "sectionId", "codeNumberId")
SELECT
  'sc' || REPLACE(GEN_RANDOM_UUID()::text, '-', ''),
  ci."sectionId",
  cic."codeNumberId"
FROM "CourseItemCode" cic
JOIN "CourseItem" ci ON ci."id" = cic."courseItemId"
GROUP BY ci."sectionId", cic."codeNumberId";
