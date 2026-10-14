-- Migration: Add tenant public primary (CTA) button colour
-- Description: Hex colour for primary actions on public pages (book, waitlist, etc.)
-- Date: 2026-09-14
-- Related: #370

ALTER TABLE tenant ADD COLUMN IF NOT EXISTS public_primary_color VARCHAR(20) DEFAULT NULL;
