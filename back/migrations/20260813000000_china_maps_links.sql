-- Add public share-link fields for China map services (高德 Amap / 腾讯地图 Tencent / 百度地图 Baidu).
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS public_amap_url VARCHAR(2048);
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS public_tencent_maps_url VARCHAR(2048);
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS public_baidu_maps_url VARCHAR(2048);
