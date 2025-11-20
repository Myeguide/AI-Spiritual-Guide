-- AlterTable
ALTER TABLE "payment_methods" ADD COLUMN     "customer_id" TEXT;

-- CreateIndex
CREATE INDEX "payment_methods_customer_id_idx" ON "payment_methods"("customer_id");
