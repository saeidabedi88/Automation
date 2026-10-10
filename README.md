# Email Automation Platform

An intelligent email automation system that classifies, prioritizes, and processes emails using natural language processing.

## Overview

The Email Automation Platform consists of three main components:

1. **Email MCP (Microservice Control Plane)**: Handles email receiving, parsing, and sending
2. **Conductor MCP**: Core orchestration service that manages email processing workflows and integrates with LLMs
3. **Dashboard**: Web interface for monitoring and human-in-the-loop reviews

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- MongoDB 6+
- RabbitMQ 3.8+
- Docker and Docker Compose (optional, but recommended)

### Setup with Docker (Recommended)

1. **Clone the repository**:
   ```
   git clone https://github.com/yourusername/email-automation-platform.git
   cd email-automation-platform
   ```

2. **Configure email credentials**:
   Update `.env` files in `src/email-mcp/src/` with your email account credentials. See the [Email Integration](#email-integration) section for details.

3. **Build and start the platform**:
   ```
   chmod +x start-email-platform.sh
   ./start-email-platform.sh
   ```

4. **Access the dashboard**:
   Open your browser and navigate to [http://localhost:5000](http://localhost:5000)

### Manual Setup

1. **Install dependencies for each service**:
   ```
   cd src/email-mcp && npm install
   cd ../conductor-mcp && npm install
   cd ../dashboard && npm install
   ```

2. **Start each service individually**:
   - Email MCP: `cd src/email-mcp && npm start`
   - Conductor MCP: `cd src/conductor-mcp && npm start`
   - Dashboard: `cd src/dashboard && npm run build:prod && npm run serve:prod`

## Email Integration

Connect one or more mailboxes from the dashboard **Settings → Connected email accounts** (Gmail, Outlook, Yahoo, iCloud, or custom IMAP). You can also bootstrap a single account with env vars — see `.env.example`.

### Inbox briefs & decisions

1. Open **Inbox Briefs** in the dashboard
2. Refresh to pull unread mail from every connected account
3. Read the short summary, write your decision notes, draft a reply, then approve & send

### Calendar & reminders

1. Open **Calendar**
2. Paste a Google/Outlook **secret ICS URL**, or create local events
3. Upcoming reminders appear at the top of the Calendar tab (and are logged by Email MCP)

### For Gmail Users

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password: Google Account → Security → App Passwords
3. Connect the account in Settings (or put the App Password in `.env`)
4. For calendar: Google Calendar → Settings → Integrate calendar → Secret address in iCal format

## Testing the System

1. Start the platform using the instructions above
2. Send an email to the configured email account
3. The system will automatically check for new emails (default: every 60 seconds)
4. Once processed, the email will appear in the dashboard
5. Check the Analytics section to see statistics about processed emails

## Development

### Architecture

```
┌─────────────┐     ┌──────────────┐     ┌───────────┐
│  Email MCP  │◄────┤ Conductor MCP│◄────┤ Dashboard │
└─────┬───────┘     └──────┬───────┘     └─────┬─────┘
      │                    │                   │
      │                    │                   │
      ▼                    ▼                   ▼
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│  PostgreSQL │     │   MongoDB    │     │ Web Browser│
└─────────────┘     └──────────────┘     └────────────┘
      │                    │                    
      │                    │                    
      └──────────►◄────────┘                    
                  │                             
                  ▼                             
            ┌──────────┐                        
            │ RabbitMQ │                        
            └──────────┘                        
```

### Customization

- **Email templates**: Located in `src/email-mcp/src/templates/`
- **LLM prompts**: Located in `src/conductor-mcp/src/services/llmService.js`
- **Dashboard UI**: React components in `src/dashboard/src/components/`

## License

MIT 