/*
  Warnings:

  - Added the required column `monthResetAt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tierId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "minuteResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "monthResetAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "subscriptionExpiresAt" TIMESTAMP(3),
ADD COLUMN     "tierId" TEXT NOT NULL,
ADD COLUMN     "tokensUsedLifetime" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tokensUsedThisMin" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tokensUsedThisMonth" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PriorityTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokensPerMinute" INTEGER NOT NULL,
    "tokensPerMonth" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "validityDays" INTEGER NOT NULL,

    CONSTRAINT "PriorityTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriorityTier_name_key" ON "PriorityTier"("name");

-- CreateIndex
CREATE INDEX "TokenHistory_userId_createdAt_idx" ON "TokenHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "User_tierId_idx" ON "User"("tierId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_subscriptionExpiresAt_idx" ON "User"("subscriptionExpiresAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "PriorityTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenHistory" ADD CONSTRAINT "TokenHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
