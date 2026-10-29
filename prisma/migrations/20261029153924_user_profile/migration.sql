-- AlterTable
ALTER TABLE "User" ADD COLUMN     "photoData" BYTEA,
ADD COLUMN     "photoMime" TEXT,
ADD COLUMN     "photoUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EmailChangeRequest" (
    "id" TEXT NOT NULL,
    "newEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "EmailChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailChangeRequest_tokenHash_key" ON "EmailChangeRequest"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailChangeRequest_userId_idx" ON "EmailChangeRequest"("userId");

-- AddForeignKey
ALTER TABLE "EmailChangeRequest" ADD CONSTRAINT "EmailChangeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
