-- Migration: Tenant public menu slug (name-city) + city
-- Description: Human-readable /public-menu/{slug}; city feeds name-city format (#413)
-- Date: 2026-09-17

ALTER TABLE tenant ADD COLUMN IF NOT EXISTS city VARCHAR(120) DEFAULT NULL;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS public_slug VARCHAR(160) DEFAULT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ix_tenant_public_slug
  ON tenant (public_slug)
  WHERE public_slug IS NOT NULL;
