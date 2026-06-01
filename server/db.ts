import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function query(text: string, params?: unknown[]) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

export async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      discord_id VARCHAR(255) UNIQUE NOT NULL,
      username VARCHAR(255) NOT NULL,
      discriminator VARCHAR(10) DEFAULT '0',
      avatar VARCHAR(255),
      email VARCHAR(255),
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at BIGINT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS bots (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      name VARCHAR(255),
      avatar VARCHAR(255),
      bot_id VARCHAR(255),
      status VARCHAR(50) DEFAULT 'offline',
      prefix VARCHAR(10) DEFAULT '!',
      intents JSONB DEFAULT '[]',
      permissions JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS bot_commands (
      id VARCHAR(255) PRIMARY KEY,
      bot_id VARCHAR(255) NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      trigger_type VARCHAR(50) DEFAULT 'prefix',
      response TEXT DEFAULT '',
      enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS bot_modules (
      id VARCHAR(255) PRIMARY KEY,
      bot_id VARCHAR(255) NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
      module_name VARCHAR(255) NOT NULL,
      enabled BOOLEAN DEFAULT false,
      config JSONB DEFAULT '{}',
      UNIQUE(bot_id, module_name)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid VARCHAR NOT NULL COLLATE "default",
      sess JSON NOT NULL,
      expire TIMESTAMP(6) NOT NULL
    ) WITH (OIDS=FALSE)
  `);

  await query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey') THEN
        ALTER TABLE sessions ADD CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;
      END IF;
    END $$
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions (expire)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS bot_logs (
      id VARCHAR(255) PRIMARY KEY,
      bot_id VARCHAR(255) NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
      level VARCHAR(20) DEFAULT 'info',
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_bot_logs_bot_id ON bot_logs (bot_id, created_at DESC)
  `);

  console.log("Database initialized successfully");
}

export default pool;
