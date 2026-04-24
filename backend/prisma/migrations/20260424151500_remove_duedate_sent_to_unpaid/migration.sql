-- Rename SENT to UNPAID and drop due_date
ALTER TYPE "BillStatus" RENAME VALUE 'SENT' TO 'UNPAID';
ALTER TABLE "bills" DROP COLUMN IF EXISTS "due_date";
