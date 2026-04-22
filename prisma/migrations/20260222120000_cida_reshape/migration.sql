-- Drop old domain tables (order: children first)
DROP TABLE IF EXISTS "DriveItemLink" CASCADE;
DROP TABLE IF EXISTS "CourseItemCode" CASCADE;
DROP TABLE IF EXISTS "CourseItem" CASCADE;
DROP TABLE IF EXISTS "CourseProfessor" CASCADE;
DROP TABLE IF EXISTS "OauthTokenStore" CASCADE;

-- Extend UserRole (run once; ignore if already present on re-apply)
ALTER TYPE "UserRole" ADD VALUE 'CIDA';

-- Password for credentials
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" TEXT;

-- Academic structure
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startYear" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AcademicYear_startYear_idx" ON "AcademicYear"("startYear");

CREATE TABLE "TermSeason" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TermSeason_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TermSeason_key_key" ON "TermSeason"("key");
CREATE INDEX "TermSeason_sortOrder_idx" ON "TermSeason"("sortOrder");

CREATE TABLE "Term" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termSeasonId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Term_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Term_academicYearId_termSeasonId_key" ON "Term"("academicYearId", "termSeasonId");
CREATE INDEX "Term_academicYearId_idx" ON "Term"("academicYearId");
ALTER TABLE "Term" ADD CONSTRAINT "Term_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Term" ADD CONSTRAINT "Term_termSeasonId_fkey" FOREIGN KEY ("termSeasonId") REFERENCES "TermSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CourseOffering" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CourseOffering_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseOffering_courseId_termId_key" ON "CourseOffering"("courseId", "termId");
CREATE INDEX "CourseOffering_termId_idx" ON "CourseOffering"("termId");
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "courseOfferingId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Section_courseOfferingId_idx" ON "Section"("courseOfferingId");
ALTER TABLE "Section" ADD CONSTRAINT "Section_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SectionInstructor" (
    "userId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    CONSTRAINT "SectionInstructor_pkey" PRIMARY KEY ("userId", "sectionId")
);
CREATE INDEX "SectionInstructor_userId_idx" ON "SectionInstructor"("userId");
CREATE INDEX "SectionInstructor_sectionId_idx" ON "SectionInstructor"("sectionId");
ALTER TABLE "SectionInstructor" ADD CONSTRAINT "SectionInstructor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SectionInstructor" ADD CONSTRAINT "SectionInstructor_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- New CourseItem (per section)
CREATE TABLE "CourseItem" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "itemTypeId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "one_drive_url" TEXT,
    "link_title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CourseItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CourseItem_sectionId_idx" ON "CourseItem"("sectionId");
CREATE UNIQUE INDEX "CourseItem_sectionId_itemTypeId_number_key" ON "CourseItem"("sectionId", "itemTypeId", "number");
ALTER TABLE "CourseItem" ADD CONSTRAINT "CourseItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseItem" ADD CONSTRAINT "CourseItem_itemTypeId_fkey" FOREIGN KEY ("itemTypeId") REFERENCES "ItemTypeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CourseItemCode" (
    "id" TEXT NOT NULL,
    "courseItemId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    CONSTRAINT "CourseItemCode_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CourseItemCode_code_idx" ON "CourseItemCode"("code");
CREATE UNIQUE INDEX "CourseItemCode_courseItemId_code_key" ON "CourseItemCode"("courseItemId", "code");
ALTER TABLE "CourseItemCode" ADD CONSTRAINT "CourseItemCode_courseItemId_fkey" FOREIGN KEY ("courseItemId") REFERENCES "CourseItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
