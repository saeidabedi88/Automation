const express = require('express');
const path = require('path');
const cors = require('cors');
const net = require('net');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');

const app = express();
const PREFERRED_PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const FORCE_STANDALONE = process.env.FORCE_STANDALONE === 'true' ? true : false;

// Mock data directory
const mockDataDir = path.join(__dirname, 'mock-data');
if (!fs.existsSync(mockDataDir)) {
  fs.mkdirSync(mockDataDir);
}

// Basic mock data for common API endpoints
const mockData = {
  emails: [
    {
      id: 'mock-email-1',
      subject: 'Question about product pricing',
      sender: 'customer@example.com',
      received_at: new Date(Date.now() - 3600000).toISOString(),
      status: 'pending_review',
      intent: 'pricing_inquiry',
      risk_level: 'low'
    },
    {
      id: 'mock-email-2',
      subject: 'Urgent: Account access issue',
      sender: 'urgent@example.com',
      received_at: new Date(Date.now() - 7200000).toISOString(),
      status: 'pending_review',
      intent: 'account_issue',
      risk_level: 'high'
    },
    {
      id: 'mock-email-3',
      subject: 'Feedback on recent service',
      sender: 'feedback@example.com',
      received_at: new Date(Date.now() - 10800000).toISOString(),
      status: 'pending_review',
      intent: 'feedback',
      risk_level: 'medium'
    }
  ],
  analytics: {
    total_emails: 127,
    auto_processed: 98,
    pending_review: 29,
    avg_processing_time: "2.3",
    intent_distribution: {
      pricing_inquiry: 35,
      account_issue: 42,
      feedback: 21,
      information_request: 18,
      other: 11
    },
    risk_distribution: {
      low: 73,
      medium: 39,
      high: 15
    },
    daily_volume: [
      { date: '2023-04-01', count: 18 },
      { date: '2023-04-02', count: 22 },
      { date: '2023-04-03', count: 15 },
      { date: '2023-04-04', count: 19 },
      { date: '2023-04-05', count: 25 },
      { date: '2023-04-06', count: 17 },
      { date: '2023-04-07', count: 11 }
    ]
  }
};

// Save mock data to files
fs.writeFileSync(
  path.join(mockDataDir, 'emails.json'),
  JSON.stringify(mockData.emails, null, 2)
);
fs.writeFileSync(
  path.join(mockDataDir, 'analytics.json'),
  JSON.stringify(mockData.analytics, null, 2)
);

// Function to check if a port is in use
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

// Function to find an available port
async function findAvailablePort(startPort) {
  let port = startPort;
  const MAX_PORT = startPort + 10; // Try up to 10 ports

  while (port < MAX_PORT) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
    port++;
  }

  console.error('Could not find an available port. Using fallback port 0 (random)');
  return 0; // Let the OS assign a random port
}

// Check if backend API is available
async function checkApiConnection() {
  if (FORCE_STANDALONE) {
    console.log('Forced standalone mode enabled. Will not try to connect to backend API.');
    return false;
  }

  try {
    const apiUrl = new URL(API_URL);
    const available = await isPortAvailable(Number(apiUrl.port));
    return !available; // If port is not available, then something is running there
  } catch (error) {
    console.error('Error checking API connection:', error.message);
    return false;
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'build')));

// Setup API handling - either proxy or mock
app.use('/api', async (req, res, next) => {
  const apiAvailable = await checkApiConnection();

  if (apiAvailable) {
    // If API is available, proxy the request
    console.log(`Proxying API request to ${API_URL}: ${req.method} ${req.url}`);
    const apiProxy = createProxyMiddleware({
      target: API_URL.replace('/api', ''),
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api', // Don't rewrite the path
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        handleMockRequest(req, res);
      }
    });
    return apiProxy(req, res, next);
  } else {
    // If API is not available, use mock data
    return handleMockRequest(req, res);
  }
});

// Handle mock API requests
function handleMockRequest(req, res) {
  console.log(`Using mock data for: ${req.method} ${req.url}`);

  // Email-related endpoints
  if (req.path.startsWith('/emails')) {
    if (req.path === '/emails/review') {
      return res.json({
        emails: mockData.emails,
        pagination: {
          total: mockData.emails.length,
          page: 1,
          per_page: 10
        }
      });
    } else if (req.path.match(/\/emails\/[a-zA-Z0-9-]+$/)) {
      const emailId = req.path.split('/').pop();
      const email = mockData.emails.find(e => e.id === emailId) || mockData.emails[0];
      return res.json({
        ...email,
        body: `This is a mock email body for ${email.subject}`,
        metadata: {
          ip: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          attachments: []
        }
      });
    }
  }

  // Analytics endpoint
  if (req.path === '/analytics') {
    return res.json(mockData.analytics);
  }

  // Connected accounts
  if (req.path === '/accounts/providers') {
    return res.json({
      status: 'success',
      data: {
        gmail: { label: 'Gmail', help: 'Use a Google App Password.' },
        outlook: { label: 'Outlook / Microsoft 365' },
        custom: { label: 'Custom IMAP/SMTP' }
      }
    });
  }
  if (req.path === '/accounts') {
    return res.json({ status: 'success', data: [] });
  }

  // Inbox briefs
  if (req.path === '/inbox/unread') {
    return res.json({
      status: 'success',
      data: {
        items: mockData.emails.map((email) => ({
          id: email.id,
          accountId: 'mock-account',
          accountEmail: 'you@example.com',
          accountLabel: 'Primary',
          subject: email.subject,
          from: email.sender,
          date: email.received_at,
          brief: {
            summary: `Unread: ${email.subject}`,
            urgency: email.risk_level === 'high' ? 'high' : 'normal',
            suggestedAction: 'review and reply',
            keyPoints: [`Intent: ${email.intent}`]
          },
          status: 'unread',
          draftReply: null,
          decision: null
        })),
        updatedAt: new Date().toISOString(),
        errors: []
      }
    });
  }

  // Calendar
  if (req.path === '/calendar/upcoming' || req.path === '/calendar/events') {
    const start = new Date(Date.now() + 90 * 60 * 1000).toISOString();
    return res.json({
      status: 'success',
      data: [{
        id: 'mock-event-1',
        title: 'Product sync',
        location: 'Zoom',
        start,
        end: new Date(Date.now() + 150 * 60 * 1000).toISOString(),
        reminderMinutes: [60, 15]
      }]
    });
  }
  if (req.path === '/calendar/reminders') {
    return res.json({
      status: 'success',
      data: [{
        key: 'mock-event-1:60',
        title: 'Product sync',
        message: 'In 60 minutes: Product sync @ Zoom',
        dueAt: new Date().toISOString()
      }]
    });
  }
  if (req.path === '/calendar/sources') {
    return res.json({ status: 'success', data: [] });
  }

  // Default response for unhandled endpoints
  return res.json({
    status: 'success',
    message: 'Mock API response',
    note: 'This is mock data because the backend API is not available.',
    endpoint: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
}

// Handle all other routes by serving the index.html
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api')) {
    return next();
  }

  // Skip static file requests
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|json|svg)$/)) {
    return next();
  }

  // For all other routes, serve index.html
  res.sendFile(path.join(__dirname, 'build', 'index.html'), (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(500).send('Error serving the application');
    }
  });
});

// Start the server with auto port detection
async function startServer() {
  const port = await findAvailablePort(PREFERRED_PORT);
  const apiAvailable = await checkApiConnection();

  app.listen(port, () => {
    console.log(`\n=== Dashboard Server ===`);
    console.log(`Server is running on port ${port}`);
    console.log(`Open http://localhost:${port} to view the dashboard`);

    if (apiAvailable) {
      console.log(`Connected to backend API at ${API_URL}`);
    } else {
      console.log(`Running in STANDALONE mode with mock data (backend API not available)`);
      console.log(`Mock data directory: ${mockDataDir}`);
    }
    console.log(`=============================\n`);
  });
}

startServer(); 