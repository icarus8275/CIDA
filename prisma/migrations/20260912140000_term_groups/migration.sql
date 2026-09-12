-- Custom groups (extracurricular, etc.) sit at the same level as academic terms.
CREATE TYPE "TermKind" AS ENUM ('ACADEMIC', 'GROUP');

ALTER TABLE "Term" ADD COLUMN "kind" "TermKind" NOT NULL DEFAULT 'ACADEMIC';
ALTER TABLE "Term" ADD COLUMN "group_label" TEXT;
ALTER TABLE "Term" ALTER COLUMN "termSeasonId" DROP NOT NULL;
