-- WeChat Mini Program v1: openid → local account bindings (staff User or end-user Customer).
-- Unique per (appid, openid). See agents2/tasks/WIP-0-20260814-1400-mp-stage1-contract-credentials.md

CREATE TABLE IF NOT EXISTS mp_binding (
    id SERIAL PRIMARY KEY,
    appid VARCHAR(64) NOT NULL,
    openid VARCHAR(128) NOT NULL,
    unionid VARCHAR(128),
    binding_type VARCHAR(16) NOT NULL,
    user_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    customer_id INTEGER REFERENCES customer(id) ON DELETE SET NULL,
    nickname VARCHAR(128),
    avatar_url VARCHAR(512),
    phone VARCHAR(32),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mp_binding_appid_openid ON mp_binding(appid, openid);
CREATE INDEX IF NOT EXISTS idx_mp_binding_user ON mp_binding(binding_type, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mp_binding_customer ON mp_binding(customer_id) WHERE customer_id IS NOT NULL;
