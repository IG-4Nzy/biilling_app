-- Company Profile
CREATE TABLE IF NOT EXISTS "company_profile" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "state_code" TEXT NOT NULL DEFAULT '',
    "pincode" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "mobile" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "gstin" TEXT NOT NULL DEFAULT '',
    "reg_no" TEXT NOT NULL DEFAULT '',
    "factory_reg_no" TEXT NOT NULL DEFAULT '',
    "bank_name" TEXT NOT NULL DEFAULT '',
    "bank_branch" TEXT NOT NULL DEFAULT '',
    "bank_account" TEXT NOT NULL DEFAULT '',
    "bank_ifsc" TEXT NOT NULL DEFAULT '',
    "logo_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "company_profile_pkey" PRIMARY KEY ("id")
);

-- Customer: add state/state_code, change address from JSON to text
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "state_code" TEXT;
ALTER TABLE "customers" ALTER COLUMN "address" TYPE TEXT USING address::TEXT;

-- Product: add HSN code
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "hsn_code" TEXT;

-- Bill: add PO/DC, consignee, GST split, invoice_date
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "invoice_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "purchase_order_no" TEXT;
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "po_date" TIMESTAMP(3);
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "dc_no" TEXT;
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "dc_date" TIMESTAMP(3);
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "consignee_name" TEXT;
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "consignee_address" TEXT;
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "consignee_gstin" TEXT;
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "consignee_state" TEXT;
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "consignee_state_code" TEXT;
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "cgst_total" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "sgst_total" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "igst_total" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- BillItem: add HSN, gross_value, GST split columns
ALTER TABLE "bill_items" ADD COLUMN IF NOT EXISTS "hsn_code" TEXT;
ALTER TABLE "bill_items" ADD COLUMN IF NOT EXISTS "gross_value" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "bill_items" ADD COLUMN IF NOT EXISTS "cgst_rate" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "bill_items" ADD COLUMN IF NOT EXISTS "cgst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "bill_items" ADD COLUMN IF NOT EXISTS "sgst_rate" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "bill_items" ADD COLUMN IF NOT EXISTS "sgst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "bill_items" ADD COLUMN IF NOT EXISTS "igst_rate" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "bill_items" ADD COLUMN IF NOT EXISTS "igst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Remove old discount columns from bill_items (no longer needed in this format)
ALTER TABLE "bill_items" DROP COLUMN IF EXISTS "discount_type";
ALTER TABLE "bill_items" DROP COLUMN IF EXISTS "discount_value";
