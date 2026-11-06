-- CreateTable
CREATE TABLE "TaskOrder" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,

    CONSTRAINT "TaskOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskOrder_userId_idx" ON "TaskOrder"("userId");

-- CreateIndex
CREATE INDEX "TaskOrder_taskId_idx" ON "TaskOrder"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskOrder_userId_taskId_key" ON "TaskOrder"("userId", "taskId");

-- AddForeignKey
ALTER TABLE "TaskOrder" ADD CONSTRAINT "TaskOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskOrder" ADD CONSTRAINT "TaskOrder_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
