-- CreateEnum
CREATE TYPE "NotifChannel" AS ENUM ('INSTANT', 'DIGEST', 'OFF');

-- CreateEnum
CREATE TYPE "DigestFrequency" AS ENUM ('HOURLY', 'DAILY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastDigestAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "mentions" "NotifChannel" NOT NULL DEFAULT 'INSTANT',
    "assignments" "NotifChannel" NOT NULL DEFAULT 'INSTANT',
    "discussions" "NotifChannel" NOT NULL DEFAULT 'DIGEST',
    "taskChanges" "NotifChannel" NOT NULL DEFAULT 'DIGEST',
    "dueReminders" "NotifChannel" NOT NULL DEFAULT 'INSTANT',
    "digestFrequency" "DigestFrequency" NOT NULL DEFAULT 'DAILY',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationOutbox" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityId" TEXT,
    "kind" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationOutbox_userId_activityId_key" ON "NotificationOutbox"("userId", "activityId");

-- CreateIndex
CREATE INDEX "NotificationOutbox_userId_sentAt_idx" ON "NotificationOutbox"("userId", "sentAt");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationOutbox" ADD CONSTRAINT "NotificationOutbox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
