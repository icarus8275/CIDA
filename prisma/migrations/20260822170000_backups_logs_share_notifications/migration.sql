-- CreateEnum
CREATE TYPE "BackupTrigger" AS ENUM ('SCHEDULED', 'MANUAL');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('SHARE_REQUEST', 'SHARE_ACCEPTED', 'SHARE_DECLINED', 'SHARE_ENDED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ShareRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- CreateTable
CREATE TABLE "DataBackup" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trigger" "BackupTrigger" NOT NULL,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,

    CONSTRAINT "DataBackup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "actorEmail" TEXT,
    "summaryEn" TEXT NOT NULL,
    "summaryKo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleKo" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "bodyKo" TEXT NOT NULL,
    "href" TEXT,
    "payload" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseShareGroup" (
    "id" TEXT NOT NULL,
    "courseOfferingId" TEXT NOT NULL,
    "poolSectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseShareGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseShareMember" (
    "shareGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseShareMember_pkey" PRIMARY KEY ("shareGroupId","userId")
);

-- CreateTable
CREATE TABLE "CourseShareRequest" (
    "id" TEXT NOT NULL,
    "courseOfferingId" TEXT NOT NULL,
    "shareGroupId" TEXT,
    "requesterUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "status" "ShareRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "CourseShareRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataBackup_createdAt_idx" ON "DataBackup"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_actorId_idx" ON "ActivityLog"("actorId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CourseShareGroup_courseOfferingId_idx" ON "CourseShareGroup"("courseOfferingId");

-- CreateIndex
CREATE INDEX "CourseShareGroup_poolSectionId_idx" ON "CourseShareGroup"("poolSectionId");

-- CreateIndex
CREATE INDEX "CourseShareMember_userId_idx" ON "CourseShareMember"("userId");

-- CreateIndex
CREATE INDEX "CourseShareRequest_courseOfferingId_idx" ON "CourseShareRequest"("courseOfferingId");

-- CreateIndex
CREATE INDEX "CourseShareRequest_targetUserId_status_idx" ON "CourseShareRequest"("targetUserId", "status");

-- CreateIndex
CREATE INDEX "CourseShareRequest_requesterUserId_idx" ON "CourseShareRequest"("requesterUserId");

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseShareGroup" ADD CONSTRAINT "CourseShareGroup_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseShareGroup" ADD CONSTRAINT "CourseShareGroup_poolSectionId_fkey" FOREIGN KEY ("poolSectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseShareMember" ADD CONSTRAINT "CourseShareMember_shareGroupId_fkey" FOREIGN KEY ("shareGroupId") REFERENCES "CourseShareGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseShareMember" ADD CONSTRAINT "CourseShareMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseShareRequest" ADD CONSTRAINT "CourseShareRequest_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseShareRequest" ADD CONSTRAINT "CourseShareRequest_shareGroupId_fkey" FOREIGN KEY ("shareGroupId") REFERENCES "CourseShareGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseShareRequest" ADD CONSTRAINT "CourseShareRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseShareRequest" ADD CONSTRAINT "CourseShareRequest_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
