-- Add China invoice (发票) fields to billing_customer.
-- Used when tenant.fiscal_country == 'CN' for 扫码开票 / electronic invoice.
ALTER TABLE billing_customer ADD COLUMN IF NOT EXISTS invoice_title_type VARCHAR(16);
ALTER TABLE billing_customer ADD COLUMN IF NOT EXISTS bank_name VARCHAR(128);
ALTER TABLE billing_customer ADD COLUMN IF NOT EXISTS bank_account VARCHAR(64);
ALTER TABLE billing_customer ADD COLUMN IF NOT EXISTS invoice_phone VARCHAR(32);