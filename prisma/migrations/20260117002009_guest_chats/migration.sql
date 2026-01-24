-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "anon_id" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Thread" ADD COLUMN     "anon_id" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Message_anon_id_idx" ON "Message"("anon_id");

-- CreateIndex
CREATE INDEX "Thread_anon_id_lastMessageAt_idx" ON "Thread"("anon_id", "lastMessageAt");
