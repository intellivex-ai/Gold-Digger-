-- Core tables (simplified)

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  cash DECIMAL(16,2) DEFAULT 10000.00,
  reputation INT DEFAULT 0,
  corporation_id INT REFERENCES corporations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE businesses (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) CHECK (type IN ('retail','real_estate','manufacturing','tech')),
  name VARCHAR(100),
  level INT DEFAULT 1,
  revenue_per_hour DECIMAL(10,2),
  upgrade_cost DECIMAL(10,2),
  location VARCHAR(100),
  manager_id INT, -- future
  last_collected_at TIMESTAMPTZ
);

CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  type VARCHAR(20) CHECK (type IN ('stock_buy','stock_sell','property_buy','rent_collect','corp_deposit')),
  amount DECIMAL(14,2),
  description TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE portfolios (
  user_id INT REFERENCES users(id),
  symbol VARCHAR(10),
  quantity INT,
  avg_price DECIMAL(10,2),
  PRIMARY KEY (user_id, symbol)
);

CREATE TABLE corporations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE,
  description TEXT,
  bank DECIMAL(16,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE marketplace_orders (
  id SERIAL PRIMARY KEY,
  seller_id INT REFERENCES users(id),
  item_type VARCHAR(20),
  item_id INT, -- generic reference
  price DECIMAL(10,2),
  quantity INT,
  status VARCHAR(10) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
