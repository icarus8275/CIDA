-- CreateTable: admin-managed code catalog; CourseItemCode links to it.
CREATE TABLE "CodeNumber" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeNumber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CodeNumber_value_key" ON "CodeNumber"("value");

-- One CodeNumber per distinct value used on existing items
INSERT INTO "CodeNumber" ("id", "value", "label", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT
  'cn' || REPLACE(GEN_RANDOM_UUID()::text, '-', '')
  , d.v
  , NULL
  , 0
  , true
  , CURRENT_TIMESTAMP
  , CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT UPPER(BTRIM("code")) AS v
  FROM "CourseItemCode"
  WHERE "code" IS NOT NULL AND BTRIM("code") <> ''
) d;

-- Link rows to catalog
ALTER TABLE "CourseItemCode" ADD COLUMN "codeNumberId" TEXT;

UPDATE "CourseItemCode" c
SET "codeNumberId" = n."id"
FROM "CodeNumber" n
WHERE n."value" = UPPER(BTRIM(c."code"));

-- Must resolve every old row; fail fast if not
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "CourseItemCode" WHERE "codeNumberId" IS NULL) THEN
    RAISE EXCEPTION 'Code migration: CourseItemCode rows without a matching CodeNumber';
  END IF;
END $$;

DROP INDEX IF EXISTS "CourseItemCode_courseItemId_code_key";
DROP INDEX IF EXISTS "CourseItemCode_code_idx";

ALTER TABLE "CourseItemCode" DROP COLUMN "code";

ALTER TABLE "CourseItemCode" ALTER COLUMN "codeNumberId" SET NOT NULL;

CREATE INDEX "CourseItemCode_codeNumberId_idx" ON "CourseItemCode"("codeNumberId");

CREATE UNIQUE INDEX "CourseItemCode_courseItemId_codeNumberId_key" ON "CourseItemCode"("courseItemId", "codeNumberId");

ALTER TABLE "CourseItemCode" ADD CONSTRAINT "CourseItemCode_codeNumberId_fkey" FOREIGN KEY ("codeNumberId") REFERENCES "CodeNumber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
