-- DropIndex
DROP INDEX "public"."OtpCode_userId_key";

-- AlterTable
ALTER TABLE "OtpCode" ADD COLUMN     "isUsed" BOOLEAN NOT NULL DEFAULT false;
