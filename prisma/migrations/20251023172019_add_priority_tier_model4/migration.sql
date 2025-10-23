/*
  Warnings:

  - You are about to drop the `priority_tiers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."subscriptions" DROP CONSTRAINT "subscriptions_tier_id_fkey";

-- AlterTable
ALTER TABLE "OtpCode" ALTER COLUMN "userId" DROP NOT NULL;

-- DropTable
DROP TABLE "public"."priority_tiers";

-- CreateTable
CREATE TABLE "subscription_tiers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "total_requests" INTEGER NOT NULL,
    "price" TEXT NOT NULL,
    "validity_days" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "description" TEXT,
    "features" TEXT[],

    CONSTRAINT "subscription_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_tiers_name_key" ON "subscription_tiers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_tiers_type_key" ON "subscription_tiers"("type");

-- CreateIndex
CREATE INDEX "subscription_tiers_name_idx" ON "subscription_tiers"("name");

-- CreateIndex
CREATE INDEX "subscription_tiers_type_idx" ON "subscription_tiers"("type");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "subscription_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
