-- Migration: OTP recovery codes (#400)
-- Single-use backup codes for 2FA lockout (hashed at rest; plaintext shown once).

CREATE TABLE IF NOT EXISTS user_otp_recovery_code (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    code_hash VARCHAR(64) NOT NULL,
    used_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_otp_recovery_code_user_id
    ON user_otp_recovery_code(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_otp_recovery_code_hash
    ON user_otp_recovery_code(code_hash);
