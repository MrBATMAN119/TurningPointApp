-- Seed data for Turning Point Church
-- Test data for development and demonstration

-- Insert sample members
INSERT OR IGNORE INTO members (email, first_name, last_name, phone, address, city, state, zip_code) VALUES 
  ('mrbatman@turningpointchurch.org', 'Jim', 'Barber', '812-555-0100', '123 Main St', 'Scottsburg', 'Indiana', '47170'),
  ('john.doe@email.com', 'John', 'Doe', '812-555-0101', '456 Oak Ave', 'Scottsburg', 'Indiana', '47170'),
  ('jane.smith@email.com', 'Jane', 'Smith', '812-555-0102', '789 Pine Rd', 'Scottsburg', 'Indiana', '47170'),
  ('david.cohen@email.com', 'David', 'Cohen', '812-555-0103', '321 Cedar Ln', 'Scottsburg', 'Indiana', '47170');

-- Insert sample sermons
INSERT OR IGNORE INTO sermons (title, description, scripture_reference, preacher, sermon_date, video_url, duration_minutes, tags, is_featured) VALUES 
  ('Walking in Torah Truth', 'Understanding the importance of keeping the biblical commandments in our daily walk with Messiah', 'Psalm 119:105', 'MrBATMAN', '2025-08-17', 'https://example.com/sermon1', 45, '["torah", "commandments", "biblical_living"]', TRUE),
  ('The Feast of Trumpets: A Call to Awakening', 'Preparing our hearts for the biblical feast days and their prophetic significance', 'Leviticus 23:24', 'MrBATMAN', '2025-08-10', 'https://example.com/sermon2', 38, '["feast_days", "prophecy", "trumpets"]', TRUE),
  ('Clean and Unclean: Biblical Dietary Laws', 'Why we avoid the piggy and follow biblical dietary instructions', 'Leviticus 11:7-8', 'MrBATMAN', '2025-08-03', 'https://example.com/sermon3', 42, '["dietary_laws", "clean_eating", "biblical_health"]', FALSE),
  ('Messiah in the Torah', 'Finding Yeshua throughout the Hebrew Scriptures', 'Luke 24:27', 'MrBATMAN', '2025-07-27', 'https://example.com/sermon4', 50, '["messiah", "prophecy", "hebrew_roots"]', FALSE);

-- Insert sample events
INSERT OR IGNORE INTO events (title, description, event_date, event_type, location) VALUES 
  ('Sabbath Service', 'Weekly Torah study and fellowship', '2025-08-23 10:00:00', 'service', 'The Way Fellowship, Scottsburg, IN'),
  ('Feast of Tabernacles Preparation', 'Planning and preparing for Sukkot celebration', '2025-09-15 14:00:00', 'feast_day', 'The Way Fellowship, Scottsburg, IN'),
  ('Street Ministry Outreach', 'Sharing the Gospel downtown Scottsburg', '2025-08-30 16:00:00', 'outreach', 'Downtown Scottsburg Square'),
  ('Torah Study Group', 'Deep dive into weekly Torah portion', '2025-08-21 19:00:00', 'study', 'The Way Fellowship, Scottsburg, IN'),
  ('Youth Bible Study', 'Teaching young people about biblical principles', '2025-08-24 15:00:00', 'study', 'The Way Fellowship, Scottsburg, IN');

-- Insert sample prayer requests
INSERT OR IGNORE INTO prayer_requests (requester_name, requester_email, request_text, is_urgent) VALUES 
  ('Anonymous', NULL, 'Please pray for healing from cancer diagnosis', TRUE),
  ('Mary Johnson', 'mary.j@email.com', 'Pray for my son serving overseas', FALSE),
  ('Bob Wilson', 'bob.w@email.com', 'Job interview next week, need provision', FALSE),
  ('Anonymous', NULL, 'Struggling with faith during difficult times', FALSE);

-- Insert sample newsletter subscriptions
INSERT OR IGNORE INTO newsletter_subscriptions (email, name, subscription_type, is_active, confirmed_at) VALUES 
  ('member1@email.com', 'Sarah Davis', 'all', TRUE, datetime('now')),
  ('member2@email.com', 'Michael Brown', 'sermons_only', TRUE, datetime('now')),
  ('member3@email.com', 'Rebecca Miller', 'events_only', TRUE, datetime('now'));

-- Insert sample donations (test data)
INSERT OR IGNORE INTO donations (donor_name, donor_email, amount, donation_type, payment_method, payment_status, transaction_id) VALUES 
  ('John Doe', 'john.doe@email.com', 100.00, 'tithe', 'stripe', 'completed', 'test_txn_001'),
  ('Jane Smith', 'jane.smith@email.com', 50.00, 'offering', 'stripe', 'completed', 'test_txn_002'),
  ('Anonymous Donor', NULL, 25.00, 'missions', 'paypal', 'completed', 'test_txn_003');