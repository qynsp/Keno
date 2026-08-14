import { getPool, initFallbackDb, isFallbackMode } from './pg';

export async function initDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('⚠️ [DB Warning] DATABASE_URL is not set. Starting server in local fallback mode for development preview.');
    initFallbackDb();
    return;
  }

  try {
    const pool = getPool();
    if (!pool) {
      console.warn('⚠️ [DB Warning] PostgreSQL pool unavailable. Running in local fallback mode.');
      initFallbackDb();
      return;
    }
    const client = await pool.connect();
    client.release();
    console.log('✅ Connected to PostgreSQL database.');
  } catch (err: any) {
    console.warn('⚠️ [DB Warning] Unable to connect to PostgreSQL database:', err.message);
    console.warn('⚠️ Falling back to local in-memory database store for dev server.');
    initFallbackDb();
    return;
  }

  const ddl = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      telegram_id VARCHAR(64) UNIQUE NOT NULL,
      first_name VARCHAR(255),
      username VARCHAR(255),
      balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
      role VARCHAR(20) NOT NULL DEFAULT 'USER',
      referral_code VARCHAR(64) UNIQUE NOT NULL,
      referred_by VARCHAR(64),
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INT PRIMARY KEY DEFAULT 1,
      min_stake NUMERIC(15, 2) NOT NULL DEFAULT 5.00,
      max_stake NUMERIC(15, 2) NOT NULL DEFAULT 1000.00,
      round_duration_seconds INT NOT NULL DEFAULT 60,
      draw_speed_ms INT NOT NULL DEFAULT 1000,
      house_edge_percent NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
      maintenance_mode BOOLEAN NOT NULL DEFAULT false,
      bot_username VARCHAR(255) NOT NULL DEFAULT 'casinokenobot',
      voucher_min_withdrawal NUMERIC(15, 2) NOT NULL DEFAULT 10.00,
      voucher_max_withdrawal NUMERIC(15, 2) NOT NULL DEFAULT 5000.00,
      updated_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS keno_rounds (
      id VARCHAR(64) PRIMARY KEY,
      round_number BIGINT NOT NULL,
      status VARCHAR(20) NOT NULL,
      start_time BIGINT NOT NULL,
      end_time BIGINT NOT NULL,
      drawn_numbers JSONB DEFAULT '[]'::jsonb,
      multipliers JSONB DEFAULT '{}'::jsonb,
      total_stakes NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
      total_payouts NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id VARCHAR(64) PRIMARY KEY,
      round_id VARCHAR(64) NOT NULL REFERENCES keno_rounds(id),
      user_id VARCHAR(64) NOT NULL REFERENCES users(id),
      selected_numbers JSONB NOT NULL,
      stake NUMERIC(15, 2) NOT NULL CHECK (stake > 0),
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      win_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
      matched_count INT NOT NULL DEFAULT 0,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL REFERENCES users(id),
      type VARCHAR(30) NOT NULL,
      amount NUMERIC(15, 2) NOT NULL,
      balance_after NUMERIC(15, 2) NOT NULL,
      description TEXT,
      reference_id VARCHAR(64),
      timestamp BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deposits (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL REFERENCES users(id),
      amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
      method VARCHAR(50) NOT NULL,
      transaction_ref VARCHAR(255),
      screenshot_url TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      admin_notes TEXT,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS withdrawals (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL REFERENCES users(id),
      amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
      method VARCHAR(50) NOT NULL,
      account_details TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      admin_notes TEXT,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vouchers (
      id VARCHAR(64) PRIMARY KEY,
      code VARCHAR(64) UNIQUE NOT NULL,
      amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
      usage_limit INT,
      times_used INT NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS voucher_claims (
      id VARCHAR(64) PRIMARY KEY,
      voucher_id VARCHAR(64) NOT NULL REFERENCES vouchers(id),
      user_id VARCHAR(64) NOT NULL REFERENCES users(id),
      claimed_at BIGINT NOT NULL,
      UNIQUE(voucher_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'PROMO',
      active BOOLEAN NOT NULL DEFAULT true,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(64) PRIMARY KEY,
      admin_id VARCHAR(64) NOT NULL,
      action VARCHAR(255) NOT NULL,
      details JSONB,
      timestamp BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_settings (
      id VARCHAR(64) PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payout_settings (
      id VARCHAR(64) PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at BIGINT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_round_id ON tickets(round_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
    CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
  `;

  try {
    const pool = getPool();
    if (pool) {
      await pool.query(ddl);

      // Perform column alignments in case existing database tables were created with older versions
      await pool.query(`
        -- Users alignment
        ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at BIGINT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS joined_at BIGINT;
        ALTER TABLE users ALTER COLUMN created_at TYPE BIGINT;
        ALTER TABLE users ALTER COLUMN joined_at TYPE BIGINT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'USER';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(64);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by VARCHAR(64);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS balance NUMERIC(15, 2) DEFAULT 0.00;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS total_bets INT DEFAULT 0;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS total_wins INT DEFAULT 0;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS total_payout NUMERIC(15, 2) DEFAULT 0.00;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255);
        UPDATE users SET created_at = COALESCE(joined_at, EXTRACT(EPOCH FROM NOW())::BIGINT * 1000) WHERE created_at IS NULL;
        UPDATE users SET role = 'USER' WHERE role IS NULL;
        UPDATE users SET balance = 0.00 WHERE balance IS NULL;

        -- Settings alignment
        ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey;
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS id INT DEFAULT 1;
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS key VARCHAR(64) DEFAULT 'default';
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS min_stake NUMERIC(15, 2) DEFAULT 5.00;
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS max_stake NUMERIC(15, 2) DEFAULT 1000.00;
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS round_duration_seconds INT DEFAULT 60;
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS draw_speed_ms INT DEFAULT 1000;
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS house_edge_percent NUMERIC(5, 2) DEFAULT 10.00;
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT false;
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS bot_username VARCHAR(255) DEFAULT 'casinokenobot';
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS voucher_min_withdrawal NUMERIC(15, 2) DEFAULT 10.00;
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS voucher_max_withdrawal NUMERIC(15, 2) DEFAULT 5000.00;
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS updated_at BIGINT;
        ALTER TABLE settings ALTER COLUMN updated_at TYPE BIGINT;
        ALTER TABLE settings ALTER COLUMN key DROP NOT NULL;
        UPDATE settings SET id = 1 WHERE id IS NULL;
        UPDATE settings SET draw_speed_ms = 1000 WHERE draw_speed_ms IS NULL;
        UPDATE settings SET voucher_min_withdrawal = 10.00 WHERE voucher_min_withdrawal IS NULL;
        UPDATE settings SET voucher_max_withdrawal = 5000.00 WHERE voucher_max_withdrawal IS NULL;

        -- Keno rounds alignment
        ALTER TABLE keno_rounds ADD COLUMN IF NOT EXISTS start_time BIGINT;
        ALTER TABLE keno_rounds ADD COLUMN IF NOT EXISTS end_time BIGINT;
        ALTER TABLE keno_rounds ADD COLUMN IF NOT EXISTS multipliers JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE keno_rounds ADD COLUMN IF NOT EXISTS total_stakes NUMERIC(15, 2) DEFAULT 0.00;
        ALTER TABLE keno_rounds ADD COLUMN IF NOT EXISTS total_payouts NUMERIC(15, 2) DEFAULT 0.00;
        ALTER TABLE keno_rounds ADD COLUMN IF NOT EXISTS created_at BIGINT;
        ALTER TABLE keno_rounds ADD COLUMN IF NOT EXISTS drawn_numbers JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE keno_rounds ADD COLUMN IF NOT EXISTS round_number BIGINT;
        ALTER TABLE keno_rounds ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';
        ALTER TABLE keno_rounds ALTER COLUMN round_number TYPE BIGINT;
        ALTER TABLE keno_rounds ALTER COLUMN start_time TYPE BIGINT;
        ALTER TABLE keno_rounds ALTER COLUMN end_time TYPE BIGINT;
        ALTER TABLE keno_rounds ALTER COLUMN created_at TYPE BIGINT;
        UPDATE keno_rounds SET start_time = created_at WHERE start_time IS NULL AND created_at IS NOT NULL;
        UPDATE keno_rounds SET created_at = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 WHERE created_at IS NULL;
        UPDATE keno_rounds SET start_time = created_at WHERE start_time IS NULL;
        UPDATE keno_rounds SET end_time = start_time + 60000 WHERE end_time IS NULL;

        -- Tickets alignment
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS created_at BIGINT;
        ALTER TABLE tickets ALTER COLUMN created_at TYPE BIGINT;
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS win_amount NUMERIC(15, 2) DEFAULT 0.00;
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS matched_count INT DEFAULT 0;
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING';

        -- Transactions alignment
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS timestamp BIGINT;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at BIGINT;
        ALTER TABLE transactions ALTER COLUMN timestamp TYPE BIGINT;
        ALTER TABLE transactions ALTER COLUMN created_at TYPE BIGINT;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_id VARCHAR(64);
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS balance_after NUMERIC(15, 2) DEFAULT 0.00;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS description TEXT;
        UPDATE transactions SET timestamp = created_at WHERE timestamp IS NULL AND created_at IS NOT NULL;
        UPDATE transactions SET created_at = timestamp WHERE created_at IS NULL AND timestamp IS NOT NULL;
        UPDATE transactions SET timestamp = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 WHERE timestamp IS NULL;

        -- Deposits alignment
        ALTER TABLE deposits ADD COLUMN IF NOT EXISTS admin_notes TEXT;
        ALTER TABLE deposits ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
        ALTER TABLE deposits ADD COLUMN IF NOT EXISTS transaction_ref VARCHAR(255);
        ALTER TABLE deposits ADD COLUMN IF NOT EXISTS created_at BIGINT;
        ALTER TABLE deposits ALTER COLUMN created_at TYPE BIGINT;
        ALTER TABLE deposits ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING';
        UPDATE deposits SET created_at = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 WHERE created_at IS NULL;

        -- Withdrawals alignment
        ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS admin_notes TEXT;
        ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS account_details TEXT;
        ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS account_name VARCHAR(255);
        ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS account_number VARCHAR(255);
        ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS created_at BIGINT;
        ALTER TABLE withdrawals ALTER COLUMN created_at TYPE BIGINT;
        ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING';
        UPDATE withdrawals SET account_details = COALESCE(account_details, CONCAT(account_name, ' - ', account_number), 'Account Details') WHERE account_details IS NULL;
        UPDATE withdrawals SET created_at = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 WHERE created_at IS NULL;

        -- Announcements alignment
        ALTER TABLE announcements ADD COLUMN IF NOT EXISTS message TEXT;
        ALTER TABLE announcements ADD COLUMN IF NOT EXISTS content TEXT;
        ALTER TABLE announcements ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'PROMO';
        ALTER TABLE announcements ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
        ALTER TABLE announcements ADD COLUMN IF NOT EXISTS created_at BIGINT;
        ALTER TABLE announcements ALTER COLUMN created_at TYPE BIGINT;
        UPDATE announcements SET message = COALESCE(message, content, '') WHERE message IS NULL;
        UPDATE announcements SET type = 'PROMO' WHERE type IS NULL;
        UPDATE announcements SET created_at = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 WHERE created_at IS NULL;

        -- Vouchers alignment
        ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS created_at BIGINT;
        ALTER TABLE vouchers ALTER COLUMN created_at TYPE BIGINT;
        ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS usage_limit INT;
        ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS times_used INT DEFAULT 0;
        ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
        UPDATE vouchers SET active = true WHERE active IS NULL;

        -- Voucher claims alignment
        ALTER TABLE voucher_claims ADD COLUMN IF NOT EXISTS claimed_at BIGINT;
        ALTER TABLE voucher_claims ALTER COLUMN claimed_at TYPE BIGINT;

        -- Audit logs alignment
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB;
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS timestamp BIGINT;
        ALTER TABLE audit_logs ALTER COLUMN timestamp TYPE BIGINT;
      `);

      // Default settings seed if missing
      const settingsCheck = await pool.query(`SELECT COUNT(*) FROM settings`);
      if (parseInt(settingsCheck.rows[0].count, 10) === 0) {
        await pool.query(`
          INSERT INTO settings (id, min_stake, max_stake, round_duration_seconds, draw_speed_ms, house_edge_percent, maintenance_mode, bot_username, voucher_min_withdrawal, voucher_max_withdrawal, updated_at)
          VALUES (1, 5.00, 1000.00, 60, 1000, 10.00, false, 'casinokenobot', 10.00, 5000.00, $1)
        `, [Date.now()]);
      }
    }
  } catch (err: any) {
    console.warn('⚠️ [DB Warning] Error setting up PostgreSQL tables:', err.message);
    initFallbackDb();
  }
}
