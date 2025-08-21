import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/cloudflare-workers'
import { renderer } from './renderer'
import type { Bindings, Sermon, Event, Donation, ChatMessage, PrayerRequest, Member, NewsletterSubscription } from './types'

const app = new Hono<{ Bindings: Bindings }>()

// Middleware
app.use('/api/*', cors())
app.use('/api/*', logger())
app.use(renderer)

// Serve static files from public directory
app.use('/static/*', serveStatic({ root: './public' }))

// SERMON API ROUTES
// Get all sermons with pagination and filtering
app.get('/api/sermons', async (c) => {
  const { DB } = c.env
  
  // Handle case where database is not available yet
  if (!DB) {
    return c.json({
      sermons: [
        {
          id: 1,
          title: "Walking in Torah Truth",
          description: "Understanding the importance of keeping the biblical commandments in our daily walk with Messiah",
          scripture_reference: "Psalm 119:105",
          preacher: "MrBATMAN",
          sermon_date: "2025-08-17",
          is_featured: true
        }
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
    })
  }

  const page = Number(c.req.query('page')) || 1
  const limit = Number(c.req.query('limit')) || 10
  const featured = c.req.query('featured')
  const offset = (page - 1) * limit

  try {
    let query = 'SELECT * FROM sermons WHERE 1=1'
    const params: any[] = []

    if (featured === 'true') {
      query += ' AND is_featured = 1'
    }

    query += ' ORDER BY sermon_date DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const { results } = await DB.prepare(query).bind(...params).all()
    
    // Get total count
    const countQuery = featured === 'true' 
      ? 'SELECT COUNT(*) as total FROM sermons WHERE is_featured = 1'
      : 'SELECT COUNT(*) as total FROM sermons'
    const { results: countResults } = await DB.prepare(countQuery).all()
    const total = (countResults[0] as any)?.total || 0

    return c.json({
      sermons: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    return c.json({ error: 'Failed to fetch sermons' }, 500)
  }
})

// Get single sermon by ID
app.get('/api/sermons/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')

  try {
    const { results } = await DB.prepare('SELECT * FROM sermons WHERE id = ?').bind(id).all()
    if (results.length === 0) {
      return c.json({ error: 'Sermon not found' }, 404)
    }

    // Increment view count
    await DB.prepare('UPDATE sermons SET view_count = view_count + 1 WHERE id = ?').bind(id).run()

    return c.json({ sermon: results[0] })
  } catch (error) {
    return c.json({ error: 'Failed to fetch sermon' }, 500)
  }
})

// Create new sermon (admin only - simplified for demo)
app.post('/api/sermons', async (c) => {
  const { DB } = c.env
  const sermon: Partial<Sermon> = await c.req.json()

  try {
    const { results } = await DB.prepare(`
      INSERT INTO sermons (title, description, scripture_reference, preacher, sermon_date, video_url, video_thumbnail, duration_minutes, tags, is_featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      sermon.title,
      sermon.description || '',
      sermon.scripture_reference || '',
      sermon.preacher || 'MrBATMAN',
      sermon.sermon_date,
      sermon.video_url || '',
      sermon.video_thumbnail || '',
      sermon.duration_minutes || 0,
      JSON.stringify(sermon.tags || []),
      sermon.is_featured || false
    ).run()

    return c.json({ id: results.meta.last_row_id, ...sermon }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create sermon' }, 500)
  }
})

// EVENT API ROUTES
// Get upcoming events
app.get('/api/events', async (c) => {
  const { DB } = c.env
  
  // Handle case where database is not available yet
  if (!DB) {
    return c.json({
      events: [
        {
          id: 1,
          title: "Sabbath Service",
          description: "Weekly Torah study and fellowship",
          event_date: "2025-08-23T10:00:00",
          location: "The Way Fellowship, Scottsburg, IN",
          event_type: "service"
        }
      ]
    })
  }

  const upcoming = c.req.query('upcoming')
  const type = c.req.query('type')

  try {
    let query = 'SELECT * FROM events WHERE is_published = 1'
    const params: any[] = []

    if (upcoming === 'true') {
      query += ' AND event_date >= datetime(\'now\')'
    }

    if (type) {
      query += ' AND event_type = ?'
      params.push(type)
    }

    query += ' ORDER BY event_date ASC'
    
    const { results } = await DB.prepare(query).bind(...params).all()
    return c.json({ events: results })
  } catch (error) {
    return c.json({ error: 'Failed to fetch events' }, 500)
  }
})

// Create new event
app.post('/api/events', async (c) => {
  const { DB } = c.env
  const event: Partial<Event> = await c.req.json()

  try {
    const { results } = await DB.prepare(`
      INSERT INTO events (title, description, event_date, end_date, location, event_type, max_attendees, registration_required, cost, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      event.title,
      event.description || '',
      event.event_date,
      event.end_date || null,
      event.location || 'The Way Fellowship, Scottsburg, IN',
      event.event_type || 'service',
      event.max_attendees || null,
      event.registration_required || false,
      event.cost || 0,
      event.is_published !== false
    ).run()

    return c.json({ id: results.meta.last_row_id, ...event }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create event' }, 500)
  }
})

// PRAYER REQUEST API ROUTES
// Get prayer requests (public ones)
app.get('/api/prayer-requests', async (c) => {
  const { DB } = c.env
  const status = c.req.query('status') || 'active'

  try {
    const { results } = await DB.prepare(`
      SELECT id, requester_name, request_text, is_urgent, status, prayer_count, created_at 
      FROM prayer_requests 
      WHERE status = ? AND is_anonymous = 0
      ORDER BY created_at DESC
    `).bind(status).all()

    return c.json({ prayerRequests: results })
  } catch (error) {
    return c.json({ error: 'Failed to fetch prayer requests' }, 500)
  }
})

// Submit prayer request
app.post('/api/prayer-requests', async (c) => {
  const { DB } = c.env
  const request: Partial<PrayerRequest> = await c.req.json()

  try {
    const { results } = await DB.prepare(`
      INSERT INTO prayer_requests (requester_name, requester_email, request_text, is_anonymous, is_urgent)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      request.requester_name || 'Anonymous',
      request.requester_email || null,
      request.request_text,
      request.is_anonymous || false,
      request.is_urgent || false
    ).run()

    return c.json({ id: results.meta.last_row_id, message: 'Prayer request submitted successfully' }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to submit prayer request' }, 500)
  }
})

// Update prayer count (when someone prays for a request)
app.post('/api/prayer-requests/:id/pray', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')

  try {
    await DB.prepare('UPDATE prayer_requests SET prayer_count = prayer_count + 1 WHERE id = ?').bind(id).run()
    return c.json({ message: 'Prayer counted' })
  } catch (error) {
    return c.json({ error: 'Failed to update prayer count' }, 500)
  }
})

// DONATION API ROUTES
// Get donation stats (admin view - simplified)
app.get('/api/donations/stats', async (c) => {
  const { DB } = c.env

  try {
    const { results: totalResults } = await DB.prepare(`
      SELECT SUM(amount) as total_amount, COUNT(*) as total_donations 
      FROM donations 
      WHERE payment_status = 'completed'
    `).all()

    const { results: monthlyResults } = await DB.prepare(`
      SELECT SUM(amount) as monthly_amount 
      FROM donations 
      WHERE payment_status = 'completed' 
      AND created_at >= date('now', 'start of month')
    `).all()

    return c.json({
      totalAmount: (totalResults[0] as any)?.total_amount || 0,
      totalDonations: (totalResults[0] as any)?.total_donations || 0,
      monthlyAmount: (monthlyResults[0] as any)?.monthly_amount || 0
    })
  } catch (error) {
    return c.json({ error: 'Failed to fetch donation stats' }, 500)
  }
})

// Process donation (simplified - would integrate with Stripe in production)
app.post('/api/donations', async (c) => {
  const { DB } = c.env
  const donation: Partial<Donation> = await c.req.json()

  try {
    // In production, this would process payment with Stripe first
    const transactionId = `demo_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    const { results } = await DB.prepare(`
      INSERT INTO donations (donor_name, donor_email, amount, donation_type, payment_method, transaction_id, payment_status, anonymous)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      donation.donor_name,
      donation.donor_email || null,
      donation.amount,
      donation.donation_type || 'offering',
      donation.payment_method || 'stripe',
      transactionId,
      'completed', // In production: 'pending' until Stripe confirms
      donation.anonymous || false
    ).run()

    return c.json({ 
      id: results.meta.last_row_id, 
      transactionId,
      message: 'Donation processed successfully' 
    }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to process donation' }, 500)
  }
})

// NEWSLETTER API ROUTES
// Subscribe to newsletter
app.post('/api/newsletter/subscribe', async (c) => {
  const { DB } = c.env
  const subscription: Partial<NewsletterSubscription> = await c.req.json()

  try {
    const { results } = await DB.prepare(`
      INSERT OR REPLACE INTO newsletter_subscriptions (email, name, subscription_type, is_active, confirmed_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(
      subscription.email,
      subscription.name || '',
      subscription.subscription_type || 'all',
      true
    ).run()

    return c.json({ message: 'Successfully subscribed to newsletter' }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to subscribe to newsletter' }, 500)
  }
})

// CHAT API ROUTES
// Chat with AI assistant about church, sermons, and Bible questions
app.post('/api/chat', async (c) => {
  const { DB, AI } = c.env
  const { message, sessionId } = await c.req.json()

  try {
    // Default fallback data if database not available
    let sermons = []
    let events = []
    
    if (DB) {
      // Get context about recent sermons and events
      const { results: sermonResults } = await DB.prepare(`
        SELECT title, description, scripture_reference, sermon_date, tags 
        FROM sermons 
        ORDER BY sermon_date DESC 
        LIMIT 5
      `).all()
      sermons = sermonResults

      const { results: eventResults } = await DB.prepare(`
        SELECT title, description, event_date, event_type, location 
        FROM events 
        WHERE event_date >= datetime('now') AND is_published = 1
        ORDER BY event_date ASC 
        LIMIT 5
      `).all()
      events = eventResults
    } else {
      // Fallback data
      sermons = [
        { title: "Walking in Torah Truth", description: "Biblical commandments", scripture_reference: "Psalm 119:105" }
      ]
      events = [
        { title: "Sabbath Service", description: "Torah study", event_date: "2025-08-23T10:00:00" }
      ]
    }

    // Church context for the AI
    const churchContext = {
      name: "Turning Point Church",
      location: "Scottsburg, Indiana",
      pastor: "MrBATMAN (Jim Barber)",
      beliefs: [
        "Torah Observant followers of the Messiah",
        "Keep biblical feast days",
        "Follow biblical dietary laws (no pork)",
        "Street evangelism and biblical teaching",
        "Emphasis on Hebrew roots of faith"
      ],
      serviceTimes: ["Sabbath Services", "Torah Study Groups", "Street Ministry"]
    }

    // Create context-aware prompt
    const systemPrompt = `You are a helpful AI assistant for Turning Point Church in Scottsburg, Indiana. 
    Pastor: MrBATMAN (Jim Barber) - Torah Observant follower of the Messiah
    
    Church Beliefs:
    - Torah Observant (keep biblical commandments)
    - Biblical feast days observance
    - Biblical dietary laws (no pork - "avoid the piggy")
    - Street evangelism and biblical teaching
    - Hebrew roots of Christian faith
    
    Recent Sermons: ${JSON.stringify(sermons)}
    Upcoming Events: ${JSON.stringify(events)}
    
    Answer questions about:
    1. Church events and services
    2. Sermon topics and biblical teachings
    3. Biblical questions (especially Torah-related)
    4. Church beliefs and practices
    5. How to get involved
    
    Be encouraging, biblically sound, and reflect the church's Torah-observant perspective.
    Address the user warmly and provide helpful, specific information.`

    // Use Cloudflare AI to generate response
    let botResponse = "I'm here to help with questions about Turning Point Church, sermons, events, and biblical topics. How can I assist you today?"
    
    try {
      const aiResponse = await AI.run('@cf/meta/llama-2-7b-chat-int8', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ]
      })
      
      if (aiResponse && aiResponse.response) {
        botResponse = aiResponse.response
      }
    } catch (aiError) {
      console.error('AI Error:', aiError)
      // Fallback to simple response matching
      if (message.toLowerCase().includes('sermon')) {
        botResponse = `Here are our recent sermons: ${sermons.map(s => `"${s.title}" (${s.sermon_date})`).join(', ')}. Would you like details about any specific sermon?`
      } else if (message.toLowerCase().includes('event')) {
        botResponse = `Upcoming events: ${events.map(e => `${e.title} on ${e.event_date}`).join(', ')}. All events are at The Way Fellowship in Scottsburg, IN.`
      } else if (message.toLowerCase().includes('torah') || message.toLowerCase().includes('bible')) {
        botResponse = "We're Torah Observant followers of the Messiah, keeping biblical commandments and feast days. MrBATMAN teaches about Hebrew roots and biblical living. What specific biblical topic interests you?"
      }
    }

    // Determine message type
    let messageType = 'general'
    if (message.toLowerCase().includes('sermon')) messageType = 'sermon_info'
    else if (message.toLowerCase().includes('event')) messageType = 'event_info'
    else if (message.toLowerCase().includes('bible') || message.toLowerCase().includes('torah')) messageType = 'bible_question'

    // Store conversation in database
    await DB.prepare(`
      INSERT INTO chat_conversations (session_id, user_message, bot_response, message_type)
      VALUES (?, ?, ?, ?)
    `).bind(sessionId, message, botResponse, messageType).run()

    return c.json({ response: botResponse, messageType })
  } catch (error) {
    console.error('Chat error:', error)
    return c.json({ 
      response: "I apologize, but I'm having trouble right now. Please feel free to contact the church directly or ask MrBATMAN your questions!",
      error: 'Chat service temporarily unavailable' 
    }, 500)
  }
})

// Main homepage
app.get('/', (c) => {
  return c.render(
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="church-header shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-4xl md:text-5xl font-bold text-white gold-shimmer">
                🏛️ Turning Point Church
              </h1>
              <span className="ml-6 text-xl text-yellow-300 font-semibold">Scottsburg, Indiana</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#sermons" className="nav-link text-xl">Sermons</a>
              <a href="#events" className="nav-link text-xl">Events</a>
              <a href="#donate" className="nav-link text-xl">Give</a>
              <a href="#prayer" className="nav-link text-xl">Prayer</a>
              <a href="#chat" className="nav-link text-xl">Ask Questions</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-gradient py-24 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <div className="relative max-w-6xl mx-auto px-4">
          <h2 className="text-6xl md:text-7xl font-bold mb-8 text-shadow-lg">
            Welcome to The Way Fellowship
          </h2>
          <p className="text-2xl md:text-3xl mb-8 font-semibold text-yellow-200">
            Torah Observant Followers of the Messiah
          </p>
          <p className="text-xl md:text-2xl mb-6 text-yellow-100">
            Biblical Feast Days • Hebrew Roots Teaching • Clean Living
          </p>
          <p className="text-lg md:text-xl mb-10 text-blue-100">
            Led by MrBATMAN (Jim Barber) - Encouraging biblical living and street evangelism in Scottsburg, IN
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button className="btn-gold text-xl py-4 px-10">
              📺 Watch Latest Sermon
            </button>
            <button className="btn-secondary text-xl py-4 px-10">
              📅 Upcoming Events
            </button>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 text-6xl opacity-20">✡️</div>
        <div className="absolute bottom-10 right-10 text-6xl opacity-20">🕊️</div>
      </section>

      {/* Featured Content */}
      <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16" style={{color: 'var(--royal-blue-primary)'}}>
            🌟 Welcome to Our Fellowship
          </h2>
          <div className="grid md:grid-cols-3 gap-10">
            {/* Recent Sermons */}
            <div className="church-card">
              <h3 className="text-3xl font-bold mb-6" style={{color: 'var(--royal-blue-primary)'}}>
                📺 Recent Sermons
              </h3>
              <div id="recent-sermons" className="space-y-4">
                <div className="sermon-card">
                  <h4 className="font-bold text-xl mb-2">Walking in Torah Truth</h4>
                  <p className="text-lg mb-2">Understanding biblical commandments in daily life</p>
                  <span className="scripture-reference text-base font-semibold">Psalm 119:105</span>
                </div>
              </div>
              <button className="mt-6 btn-primary text-lg">
                View All Sermons →
              </button>
            </div>

            {/* Upcoming Events */}
            <div className="church-card">
              <h3 className="text-3xl font-bold mb-6" style={{color: 'var(--church-gold-dark)'}}>
                📅 Upcoming Events
              </h3>
              <div id="upcoming-events" className="space-y-4">
                <div className="event-card">
                  <h4 className="font-bold text-xl mb-2">Sabbath Service</h4>
                  <p className="text-lg mb-2">Weekly Torah study and fellowship</p>
                  <span className="text-base font-semibold" style={{color: 'var(--church-gold-dark)'}}>
                    This Saturday 10:00 AM
                  </span>
                </div>
              </div>
              <button className="mt-6 btn-gold text-lg">
                View All Events →
              </button>
            </div>

            {/* Quick Actions */}
            <div className="church-card">
              <h3 className="text-3xl font-bold mb-6" style={{color: 'var(--royal-blue-primary)'}}>
                🤝 Get Involved
              </h3>
              <div className="space-y-4">
                <button className="w-full btn-gold text-lg py-3">
                  💝 Give Online
                </button>
                <button className="w-full btn-primary text-lg py-3">
                  🙏 Submit Prayer Request
                </button>
                <button className="w-full btn-gold text-lg py-3">
                  📧 Join Newsletter
                </button>
                <button className="w-full btn-primary text-lg py-3">
                  💬 Chat with AI Assistant
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chat Section */}
      <section id="chat" className="py-20" style={{background: 'var(--church-cream)'}}>
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-6" style={{color: 'var(--royal-blue-primary)'}}>
            💬 Ask Our AI Assistant
          </h2>
          <p className="text-xl md:text-2xl text-center mb-12" style={{color: 'var(--text-secondary)'}}>
            Get answers about sermons, events, biblical questions, and church activities!
          </p>
          <div className="chat-container max-w-4xl mx-auto">
            <div id="chat-messages" className="chat-messages custom-scrollbar">
              <div className="text-center p-6" style={{color: 'var(--royal-blue-primary)', fontSize: '1.25rem'}}>
                👋 Shalom! I'm here to help with questions about Turning Point Church, our sermons, events, and biblical topics. How can I assist you today?
              </div>
            </div>
            <div className="flex gap-4 p-6 bg-white border-t-2" style={{borderColor: 'var(--royal-blue-light)'}}>
              <input 
                type="text" 
                id="chat-input" 
                placeholder="Ask about sermons, events, or biblical questions..."
                className="chat-input flex-1"
              />
              <button 
                id="chat-send" 
                className="chat-send"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="church-footer">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-10">
            <div>
              <h3 className="text-2xl font-bold mb-6">🏛️ Turning Point Church</h3>
              <p className="text-xl mb-3">The Way Fellowship</p>
              <p className="text-xl mb-3">Scottsburg, Indiana</p>
              <p className="text-lg font-semibold" style={{color: 'var(--church-gold)'}}>
                Torah Observant • Hebrew Roots
              </p>
            </div>
            <div>
              <h4 className="text-xl font-bold mb-6">⛪ Services</h4>
              <ul className="space-y-3 text-lg">
                <li>Sabbath Services</li>
                <li>Torah Study Groups</li>
                <li>Street Ministry</li>
                <li>Biblical Feast Days</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xl font-bold mb-6">🤝 Connect</h4>
              <ul className="space-y-3 text-lg">
                <li><a href="#" className="footer-link">Contact Us</a></li>
                <li><a href="#" className="footer-link">Prayer Requests</a></li>
                <li><a href="#" className="footer-link">Newsletter</a></li>
                <li><a href="#" className="footer-link">Donate</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xl font-bold mb-6">👨‍💼 Pastor MrBATMAN</h4>
              <p className="text-lg leading-relaxed">
                Jim Barber - Torah Observant teacher, street preacher, and follower of the Messiah. 
                Encouraging biblical living and avoiding "the piggy" since his calling.
              </p>
            </div>
          </div>
          <div className="border-t-2 mt-12 pt-8 text-center" style={{borderColor: 'var(--church-gold)'}}>
            <p className="text-xl" style={{color: 'var(--church-gold)'}}>
              &copy; 2025 Turning Point Church, Scottsburg, Indiana. Built with faith and code! 🙏
            </p>
            <p className="text-lg mt-2 italic">
              "Your word is a lamp to my feet and a light to my path." - Psalm 119:105
            </p>
          </div>
        </div>
      </footer>

      {/* JavaScript will be loaded from separate file */}
      <script src="/static/app.js"></script>
    </div>
  )
})

export default app
