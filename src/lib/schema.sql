-- Run this SQL in your Supabase project's SQL Editor (https://supabase.com/dashboard/project/_/sql/new)
-- to create all the tables needed for the Soul Sips Lounge booking system.

-- Business settings (single row, id = 'default')
CREATE TABLE IF NOT EXISTS business_settings (
  "id"              TEXT PRIMARY KEY DEFAULT 'default',
  "businessName"    TEXT NOT NULL DEFAULT 'Soul Sips Lounge',
  "tagline"         TEXT NOT NULL DEFAULT '',
  "description"     TEXT NOT NULL DEFAULT '',
  "address"         TEXT NOT NULL DEFAULT '',
  "phone"           TEXT NOT NULL DEFAULT '',
  "email"           TEXT NOT NULL DEFAULT '',
  "hours"           TEXT NOT NULL DEFAULT '',
  "responseTime"    TEXT NOT NULL DEFAULT '',
  "adminPassword"   TEXT NOT NULL DEFAULT 'admin123'
);

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
  "id"            TEXT PRIMARY KEY,
  "name"          TEXT NOT NULL,
  "image"         TEXT NOT NULL DEFAULT '',
  "description"   TEXT NOT NULL DEFAULT '',
  "minGroup"      INTEGER NOT NULL DEFAULT 3,
  "maxGroup"      INTEGER NOT NULL DEFAULT 12
);

-- Room pricing tiers (linked to rooms via roomId)
CREATE TABLE IF NOT EXISTS room_pricing (
  "id"              BIGSERIAL PRIMARY KEY,
  "roomId"          TEXT NOT NULL REFERENCES rooms("id") ON DELETE CASCADE,
  "duration"        TEXT NOT NULL,
  "withCake"        BOOLEAN NOT NULL DEFAULT false,
  "perPersonRates"  JSONB NOT NULL DEFAULT '{}'
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  "id"              TEXT PRIMARY KEY,
  "name"            TEXT NOT NULL,
  "email"           TEXT NOT NULL,
  "phone"           TEXT NOT NULL DEFAULT '',
  "roomName"        TEXT NOT NULL,
  "guestCount"      INTEGER NOT NULL,
  "duration"        TEXT NOT NULL,
  "withCake"        BOOLEAN NOT NULL DEFAULT false,
  "date"            TEXT NOT NULL,
  "time"            TEXT NOT NULL,
  "perPersonPrice"  REAL NOT NULL DEFAULT 0,
  "totalPrice"      REAL NOT NULL DEFAULT 0,
  "voucherCode"     TEXT NOT NULL DEFAULT '',
  "discountAmount"  REAL NOT NULL DEFAULT 0,
  "finalPrice"      REAL NOT NULL DEFAULT 0,
  "status"          TEXT NOT NULL DEFAULT 'Pending',
  "notes"           TEXT NOT NULL DEFAULT '',
  "createdAt"     TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
);

-- ── Slot availability check (5‑min maintenance buffer) ────────────
-- Returns { available: true } or { available: false, conflicting: { id, name } }
CREATE OR REPLACE FUNCTION check_booking_available(
  p_date TEXT,
  p_room_name TEXT,
  p_start_time TEXT,
  p_duration TEXT,
  p_exclude_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_start INT;
  v_new_end   INT;
  v_conflict  JSONB;
BEGIN
  -- Convert HH:mm to minutes since midnight
  v_new_start := SPLIT_PART(p_start_time, ':', 1)::INT * 60 + SPLIT_PART(p_start_time, ':', 2)::INT;
  v_new_end   := v_new_start + (p_duration::NUMERIC * 60)::INT;

  SELECT jsonb_build_object('id', b.id, 'name', b.name)
  INTO v_conflict
  FROM bookings b
  WHERE b.date       = p_date
    AND b.roomName   = p_room_name
    AND (p_exclude_id IS NULL OR b.id != p_exclude_id)
    -- Overlap check with 5‑min maintenance buffer on both sides:
    --   new_start < (exist_end + 5) AND (new_end + 5) > exist_start
    AND v_new_start < (
      SPLIT_PART(b.time, ':', 1)::INT * 60
      + SPLIT_PART(b.time, ':', 2)::INT
      + (b.duration::NUMERIC * 60)::INT
      + 5
    )
    AND (v_new_end + 5) > (
      SPLIT_PART(b.time, ':', 1)::INT * 60
      + SPLIT_PART(b.time, ':', 2)::INT
    )
  LIMIT 1;

  IF v_conflict IS NULL THEN
    RETURN jsonb_build_object('available', true);
  ELSE
    RETURN jsonb_build_object('available', false, 'conflicting', v_conflict);
  END IF;
END;
$$;

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
  "id"            TEXT PRIMARY KEY,
  "name"          TEXT NOT NULL,
  "email"         TEXT NOT NULL,
  "phone"         TEXT NOT NULL DEFAULT '',
  "subject"       TEXT NOT NULL,
  "message"       TEXT NOT NULL,
  "status"        TEXT NOT NULL DEFAULT 'New',
  "createdAt"     TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
);

-- Vouchers
CREATE TABLE IF NOT EXISTS vouchers (
  "id"            TEXT PRIMARY KEY,
  "code"          TEXT NOT NULL UNIQUE,
  "type"          TEXT NOT NULL,
  "value"         REAL NOT NULL,
  "minPurchase"   REAL NOT NULL DEFAULT 0,
  "maxUses"       INTEGER NOT NULL DEFAULT 0,
  "usedCount"     INTEGER NOT NULL DEFAULT 0,
  "expiresAt"     TEXT NOT NULL DEFAULT '',
  "active"        BOOLEAN NOT NULL DEFAULT true,
  "description"   TEXT NOT NULL DEFAULT '',
  "createdAt"     TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  "id"            TEXT PRIMARY KEY,
  "bookingId"     TEXT NOT NULL,
  "amount"        REAL NOT NULL DEFAULT 0,
  "receiptUrl"    TEXT NOT NULL DEFAULT '',
  "status"        TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Cancelled', 'Refunded', 'Failed')),
  "notes"         TEXT NOT NULL DEFAULT '',
  "paidAt"        TEXT NOT NULL DEFAULT '',
  "confirmedAt"   TEXT NOT NULL DEFAULT '',
  "createdAt"     TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
);

-- Bank Accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
  "id"            TEXT PRIMARY KEY,
  "bankName"      TEXT NOT NULL,
  "accountName"   TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "qrCodeUrl"     TEXT NOT NULL DEFAULT '',
  "isActive"      BOOLEAN NOT NULL DEFAULT true
);
