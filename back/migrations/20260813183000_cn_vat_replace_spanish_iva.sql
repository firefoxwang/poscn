-- China VAT migration: for tenants flagged fiscal_country='CN', replace the old
-- Spanish IVA rates (10/21/0) with Chinese VAT rates (6/3/0).
-- Keeps order-item snapshots intact (old rows are closed via valid_to, never deleted).

-- 1. Close old Spanish IVA 10%/21% rows that are still open for CN tenants.
UPDATE tax t
SET valid_to = CURRENT_DATE - 1
FROM tenant tn
WHERE t.tenant_id = tn.id
  AND upper(coalesce(tn.fiscal_country, '')) = 'CN'
  AND t.rate_percent IN (10, 21)
  AND t.valid_to IS NULL;

-- 2. Rename the 0% exempt row to the Chinese label (same 0% concept) for CN tenants.
UPDATE tax t
SET name = '增值税 0% (免税)'
FROM tenant tn
WHERE t.tenant_id = tn.id
  AND upper(coalesce(tn.fiscal_country, '')) = 'CN'
  AND t.rate_percent = 0
  AND t.valid_to IS NULL
  AND t.name LIKE 'IVA %';

-- 3. Insert 6% (餐饮服务) for CN tenants missing an open 6% row.
INSERT INTO tax (tenant_id, name, rate_percent, valid_from, valid_to, created_at)
SELECT tn.id, '增值税 6% (餐饮服务)', 6, CURRENT_DATE, NULL, NOW()
FROM tenant tn
WHERE upper(coalesce(tn.fiscal_country, '')) = 'CN'
  AND NOT EXISTS (
    SELECT 1 FROM tax t
    WHERE t.tenant_id = tn.id AND t.rate_percent = 6 AND t.valid_to IS NULL
  );

-- 4. Insert 3% (小规模征收率) for CN tenants missing an open 3% row.
INSERT INTO tax (tenant_id, name, rate_percent, valid_from, valid_to, created_at)
SELECT tn.id, '增值税 3% (小规模征收率)', 3, CURRENT_DATE, NULL, NOW()
FROM tenant tn
WHERE upper(coalesce(tn.fiscal_country, '')) = 'CN'
  AND NOT EXISTS (
    SELECT 1 FROM tax t
    WHERE t.tenant_id = tn.id AND t.rate_percent = 3 AND t.valid_to IS NULL
  );

-- 5. Point default_tax_id at the 6% row for CN tenants.
UPDATE tenant tn
SET default_tax_id = sub.tax_id
FROM (
  SELECT DISTINCT ON (t.tenant_id) t.tenant_id AS tenant_id, t.id AS tax_id
  FROM tax t
  JOIN tenant tn2 ON tn2.id = t.tenant_id
  WHERE upper(coalesce(tn2.fiscal_country, '')) = 'CN'
    AND t.rate_percent = 6 AND t.valid_to IS NULL
  ORDER BY t.tenant_id, t.id
) sub
WHERE tn.id = sub.tenant_id;
