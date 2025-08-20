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
    // Get context about recent sermons and events
    const { results: sermons } = await DB.prepare(`
      SELECT title, description, scripture_reference, sermon_date, tags 
      FROM sermons 
      ORDER BY sermon_date DESC 
      LIMIT 5
    `).all()

    const { results: events } = await DB.prepare(`
      SELECT title, description, event_date, event_type, location 
      FROM events 
      WHERE event_date >= datetime('now') AND is_published = 1
      ORDER BY event_date ASC 
      LIMIT 5
    `).all()

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
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-700">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">
                🏛️ Turning Point Church
              </h1>
              <span className="ml-4 text-lg text-gray-600">Scottsburg, Indiana</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#sermons" className="text-gray-600 hover:text-blue-600 font-medium">Sermons</a>
              <a href="#events" className="text-gray-600 hover:text-blue-600 font-medium">Events</a>
              <a href="#donate" className="text-gray-600 hover:text-blue-600 font-medium">Give</a>
              <a href="#prayer" className="text-gray-600 hover:text-blue-600 font-medium">Prayer</a>
              <a href="#chat" className="text-gray-600 hover:text-blue-600 font-medium">Ask Questions</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-5xl font-bold mb-6">
            Welcome to The Way Fellowship
          </h2>
          <p className="text-xl mb-8">
            Torah Observant Followers of the Messiah • Biblical Feast Days • Hebrew Roots Teaching
          </p>
          <p className="text-lg mb-8">
            Led by MrBATMAN (Jim Barber) - Encouraging biblical living and street evangelism in Scottsburg, IN
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-yellow-500 hover:bg-yellow-600 text-blue-900 font-bold py-3 px-8 rounded-lg transition duration-300">
              Watch Latest Sermon
            </button>
            <button className="bg-transparent border-2 border-white hover:bg-white hover:text-blue-900 text-white font-bold py-3 px-8 rounded-lg transition duration-300">
              Upcoming Events
            </button>
          </div>
        </div>
      </section>

      {/* Featured Content */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Recent Sermons */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">📺 Recent Sermons</h3>
              <div id="recent-sermons" className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold">Walking in Torah Truth</h4>
                  <p className="text-gray-600 text-sm">Understanding biblical commandments in daily life</p>
                  <span className="text-xs text-blue-600">Psalm 119:105</span>
                </div>
              </div>
              <button className="mt-4 text-blue-600 hover:text-blue-800 font-semibold">
                View All Sermons →
              </button>
            </div>

            {/* Upcoming Events */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">📅 Upcoming Events</h3>
              <div id="upcoming-events" className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold">Sabbath Service</h4>
                  <p className="text-gray-600 text-sm">Weekly Torah study and fellowship</p>
                  <span className="text-xs text-green-600">This Saturday 10:00 AM</span>
                </div>
              </div>
              <button className="mt-4 text-green-600 hover:text-green-800 font-semibold">
                View All Events →
              </button>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">🤝 Get Involved</h3>
              <div className="space-y-3">
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition duration-300">
                  💝 Give Online
                </button>
                <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded transition duration-300">
                  🙏 Submit Prayer Request
                </button>
                <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition duration-300">
                  📧 Join Newsletter
                </button>
                <button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded transition duration-300">
                  💬 Chat with AI Assistant
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chat Section */}
      <section id="chat" className="py-16 bg-gray-100">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            💬 Ask Our AI Assistant
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Get answers about sermons, events, biblical questions, and church activities!
          </p>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div id="chat-messages" className="h-64 overflow-y-auto mb-4 p-4 bg-gray-50 rounded border">
              <div className="text-center text-gray-500">
                👋 Hello! I'm here to help with questions about Turning Point Church, our sermons, events, and biblical topics. How can I assist you today?
              </div>
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                id="chat-input" 
                placeholder="Ask about sermons, events, or biblical questions..."
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                id="chat-send" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition duration-300 font-semibold"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">Turning Point Church</h3>
              <p className="text-gray-300 mb-2">The Way Fellowship</p>
              <p className="text-gray-300 mb-2">Scottsburg, Indiana</p>
              <p className="text-gray-300">Torah Observant • Hebrew Roots</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Services</h4>
              <ul className="text-gray-300 space-y-2">
                <li>Sabbath Services</li>
                <li>Torah Study Groups</li>
                <li>Street Ministry</li>
                <li>Biblical Feast Days</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Connect</h4>
              <ul className="text-gray-300 space-y-2">
                <li><a href="#" className="hover:text-blue-400">Contact Us</a></li>
                <li><a href="#" className="hover:text-blue-400">Prayer Requests</a></li>
                <li><a href="#" className="hover:text-blue-400">Newsletter</a></li>
                <li><a href="#" className="hover:text-blue-400">Donate</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Pastor MrBATMAN</h4>
              <p className="text-gray-300 text-sm">
                Jim Barber - Torah Observant teacher, street preacher, and follower of the Messiah. 
                Encouraging biblical living and avoiding "the piggy" since his calling.
              </p>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Turning Point Church, Scottsburg, Indiana. Built with faith and code! 🙏</p>
          </div>
        </div>
      </footer>

      {/* JavaScript will be loaded from separate file */}
      <script src="/static/app.js"></script>
    </div>
  )
})

export default app
