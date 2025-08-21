// TypeScript types for Turning Point Church website

export interface Bindings {
  DB?: D1Database; // Optional for initial deployment
  AI?: any; // Optional Cloudflare AI binding
  STRIPE_SECRET_KEY?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  OPENAI_API_KEY?: string;
}

export interface Member {
  id?: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  member_since?: string;
  is_active?: boolean;
  receive_notifications?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Sermon {
  id?: number;
  title: string;
  description?: string;
  scripture_reference?: string;
  preacher?: string;
  sermon_date: string;
  video_url?: string;
  video_thumbnail?: string;
  audio_url?: string;
  duration_minutes?: number;
  transcript?: string;
  tags?: string;
  is_featured?: boolean;
  view_count?: number;
  likes_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Event {
  id?: number;
  title: string;
  description?: string;
  event_date: string;
  end_date?: string;
  location?: string;
  event_type?: 'service' | 'fellowship' | 'study' | 'special' | 'feast_day' | 'outreach';
  is_recurring?: boolean;
  recurrence_pattern?: string;
  max_attendees?: number;
  registration_required?: boolean;
  cost?: number;
  image_url?: string;
  is_published?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Donation {
  id?: number;
  member_id?: number;
  donor_email?: string;
  donor_name: string;
  amount: number;
  donation_type?: 'tithe' | 'offering' | 'building_fund' | 'missions' | 'special';
  payment_method?: 'stripe' | 'paypal' | 'cash' | 'check';
  transaction_id?: string;
  payment_status?: 'pending' | 'completed' | 'failed' | 'refunded';
  is_recurring?: boolean;
  recurring_frequency?: string;
  anonymous?: boolean;
  notes?: string;
  created_at?: string;
}

export interface ChatMessage {
  id?: number;
  session_id: string;
  user_message: string;
  bot_response?: string;
  message_type?: 'bible_question' | 'sermon_info' | 'event_info' | 'general';
  user_email?: string;
  is_helpful?: boolean;
  feedback?: string;
  created_at?: string;
}

export interface PrayerRequest {
  id?: number;
  requester_name: string;
  requester_email?: string;
  request_text: string;
  is_anonymous?: boolean;
  is_urgent?: boolean;
  status?: 'active' | 'answered' | 'archived';
  prayer_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface NewsletterSubscription {
  id?: number;
  email: string;
  name?: string;
  subscription_type?: 'weekly' | 'events_only' | 'sermons_only' | 'all';
  is_active?: boolean;
  confirmed_at?: string;
  created_at?: string;
}

export interface ChatContext {
  sermons: Sermon[];
  events: Event[];
  churchInfo: {
    name: string;
    location: string;
    pastor: string;
    beliefs: string[];
    service_times: string[];
  };
}