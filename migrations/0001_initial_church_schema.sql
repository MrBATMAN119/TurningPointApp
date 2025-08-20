-- Turning Point Church Database Schema
-- Created for MrBATMAN's church website

-- Members table for congregation management
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT DEFAULT 'Scottsburg',
  state TEXT DEFAULT 'Indiana',
  zip_code TEXT,
  member_since DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  receive_notifications BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sermons table for video content and messages
CREATE TABLE IF NOT EXISTS sermons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  scripture_reference TEXT,
  preacher TEXT DEFAULT 'MrBATMAN',
  sermon_date DATE NOT NULL,
  video_url TEXT,
  video_thumbnail TEXT,
  audio_url TEXT,
  duration_minutes INTEGER,
  transcript TEXT,
  tags TEXT, -- JSON array of tags
  is_featured BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Events table for church activities and announcements
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATETIME NOT NULL,
  end_date DATETIME,
  location TEXT DEFAULT 'The Way Fellowship, Scottsburg, IN',
  event_type TEXT CHECK(event_type IN ('service', 'fellowship', 'study', 'special', 'feast_day', 'outreach')) DEFAULT 'service',
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT, -- JSON for recurring events
  max_attendees INTEGER,
  registration_required BOOLEAN DEFAULT FALSE,
  cost DECIMAL(10,2) DEFAULT 0.00,
  image_url TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Donations table for tracking giving
CREATE TABLE IF NOT EXISTS donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER,
  donor_email TEXT,
  donor_name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  donation_type TEXT CHECK(donation_type IN ('tithe', 'offering', 'building_fund', 'missions', 'special')) DEFAULT 'offering',
  payment_method TEXT CHECK(payment_method IN ('stripe', 'paypal', 'cash', 'check')) DEFAULT 'stripe',
  transaction_id TEXT UNIQUE,
  payment_status TEXT CHECK(payment_status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency TEXT, -- monthly, weekly, etc.
  anonymous BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Chat conversations for the AI assistant
CREATE TABLE IF NOT EXISTS chat_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  bot_response TEXT NOT NULL,
  message_type TEXT CHECK(message_type IN ('bible_question', 'sermon_info', 'event_info', 'general')) DEFAULT 'general',
  user_email TEXT,
  is_helpful BOOLEAN,
  feedback TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Prayer requests table
CREATE TABLE IF NOT EXISTS prayer_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_name TEXT NOT NULL,
  requester_email TEXT,
  request_text TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  is_urgent BOOLEAN DEFAULT FALSE,
  status TEXT CHECK(status IN ('active', 'answered', 'archived')) DEFAULT 'active',
  prayer_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Newsletter subscriptions
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  subscription_type TEXT CHECK(subscription_type IN ('weekly', 'events_only', 'sermons_only', 'all')) DEFAULT 'all',
  is_active BOOLEAN DEFAULT TRUE,
  confirmed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sermons_date ON sermons(sermon_date DESC);
CREATE INDEX IF NOT EXISTS idx_sermons_featured ON sermons(is_featured);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_donations_member ON donations(member_id);
CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_prayer_status ON prayer_requests(status);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscriptions(email);