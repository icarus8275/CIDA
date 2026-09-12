-- Extra groups are not tied to an academic year; they sit after all terms.
ALTER TABLE "Term" ALTER COLUMN "academicYearId" DROP NOT NULL;

UPDATE "Term"
SET "academicYearId" = NULL
WHERE "kind" = 'GROUP';
