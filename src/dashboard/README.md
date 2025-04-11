# Email Automation Dashboard

A React-based dashboard for the Email Automation Platform that allows administrators to manage automated email responses, review high-risk emails, and view analytics on email processing.

## Features

- **Unified Dashboard**: A tabbed interface that provides access to all system features
- **Analytics Dashboard**: View statistics and charts about email volume, intent distribution, and processing metrics
- **Email Processing**: Review and respond to high-risk emails that require human intervention
- **Settings**: Configure system parameters for email processing and notifications

## Tech Stack

- **React**: Frontend library
- **Material-UI**: Component library for a modern look and feel
- **React Router**: For navigation and routing
- **React Query**: For handling API requests with caching
- **Chart.js**: For analytics visualizations
- **Notistack**: For toast notifications
- **Axios**: For API communication

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the dashboard directory:
   ```
   cd src/dashboard
   ```
3. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```
4. Create a `.env` file with the following variables:
   ```
   REACT_APP_API_URL=http://localhost:3001/api
   REACT_APP_RAG_API_URL=http://localhost:3003/api
   REACT_APP_USE_MOCK_DATA=false
   ```

### Development

Start the development server:

```
npm start
```

The application will be available at http://localhost:3000.

### Building for Production

Build the application for production:

```
npm run build
```

## Project Structure

```
src/
├── components/        # Reusable components
│   ├── dashboard/     # Dashboard-specific components
│   │   ├── Analytics.js
│   │   ├── EmailProcessor.js
│   │   └── SettingsPanel.js
│   └── layouts/       # Layout components
│       └── MainLayout.js
├── pages/             # Page components
│   ├── UnifiedDashboard.js
│   ├── Login.js
│   └── NotFound.js
├── services/          # API and utility services
│   └── api.js
├── App.js             # Main application component
├── index.js           # Entry point
└── index.css          # Global styles
```

## API Integration

To connect to the Email Automation API endpoints:

1. Configure your `.env` file with the following:
   ```
   REACT_APP_API_URL=http://localhost:3001/api
   REACT_APP_RAG_API_URL=http://localhost:3003/api
   REACT_APP_USE_MOCK_DATA=false
   ```
2. Ensure that the Email Automation API service is running.
3. Ensure the RAG server is running for knowledge retrieval functionality.

The dashboard uses the following API endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/emails` | GET | Get a list of emails requiring review |
| `/emails/:id` | GET | Get details of a specific email |
| `/emails/:id/classification` | GET | Get classification for a specific email |
| `/emails/:id/response-options` | GET | Get response templates for a specific email |
| `/responses` | POST | Submit a final response to an email |
| `/responses/draft` | POST | Save a draft response for an email |
| `/tasks/:id` | PATCH | Update a task status |
| `/analytics/emails` | GET | Get email analytics data |

The dashboard also integrates with the RAG (Retrieval-Augmented Generation) server using these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/rag/query` | POST | Query the knowledge base for relevant context |
| `/rag/email-context` | POST | Store email content in the knowledge base |
| `/rag/email-context/:id` | GET | Retrieve stored context for an email |
| `/health` | GET | Check RAG server health status |

### Error Handling

The application will use mock data during development if `REACT_APP_USE_MOCK_DATA` is set to `true`, or if there are network errors when trying to connect to the API endpoints. In production, actual errors will be thrown.

## RAG Integration

The dashboard includes a Retrieval-Augmented Generation (RAG) system that provides relevant context when responding to emails. The RAG system allows users to:

1. Query the knowledge base for information related to an email
2. Store important email content in the knowledge base for future reference
3. Use retrieved context directly in email responses

### RAG Configuration

To use the RAG features, you need to:

1. Configure the RAG server connection in your `.env` file:
   ```
   REACT_APP_RAG_API_URL=http://localhost:3003/api
   ```

2. Ensure the RAG server is running. The default implementation uses a simulated RAG system, but in production, it should connect to a proper vector database like ChromaDB or Pinecone.

3. To use mock data during development, set:
   ```
   REACT_APP_USE_MOCK_DATA=true
   ```

### RAG Features

The RAG integration provides the following features:

1. **Context Retrieval**: When reviewing an email, users can query the knowledge base for relevant information that might help in crafting a response. This appears in the "Context" tab of the email review interface.

2. **Knowledge Storage**: Important emails can be stored in the knowledge base for future reference. Users can categorize and tag the content to improve retrievability. This functionality is available in the "Store Knowledge" tab.

3. **Health Monitoring**: The system continuously monitors the health of the RAG service and provides appropriate UI feedback when the service is unavailable.

4. **Content Insertion**: Retrieved context can be directly inserted into response drafts with a single click.

### RAG Architecture

The RAG system consists of:

1. A separate RAG server that handles embedding and retrieval operations
2. A vector database for storing embeddings and facilitating semantic search
3. Integration points in the dashboard UI for querying and storing knowledge

In the development environment, the system uses mock data if the RAG server is unavailable or if `REACT_APP_USE_MOCK_DATA` is set to `true`.

## Authentication

The application includes authentication logic, but it's currently bypassed for development purposes. To enable authentication:

1. Uncomment the authentication code in `App.js`
2. Configure the API service to use your authentication endpoints

## Email Integration

### Setting Up Email Account Access

To receive and send emails, you need to configure your email account credentials in the Email MCP service:

1. **Edit Email MCP Environment File**:
   Update the `.env` file in `src/email-mcp/src/` with your email credentials:

   ```
   # SMTP (for sending emails)
   SMTP_HOST=smtp.gmail.com  # Or your email provider's SMTP server
   SMTP_PORT=587             # Typically 587 for TLS or 465 for SSL
   SMTP_SECURE=false         # true for SSL (port 465), false for TLS (port 587)
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password  # For Gmail, use an App Password
   DEFAULT_FROM_EMAIL=your-email@gmail.com

   # IMAP (for receiving emails)
   ENABLE_EMAIL_POLLING=true
   EMAIL_POLL_INTERVAL=60000  # Poll every 60 seconds
   IMAP_HOST=imap.gmail.com   # Or your email provider's IMAP server
   IMAP_PORT=993              # Typically 993 for secure IMAP
   IMAP_USER=your-email@gmail.com
   IMAP_PASSWORD=your-app-password  # Same App Password as SMTP
   IMAP_TLS=true
   ```

2. **For Gmail Users**:
   - Enable 2-Factor Authentication on your Google account
   - Generate an App Password: Google Account → Security → App Passwords
   - Use this App Password instead of your regular password

3. **Testing Email Reception**:
   - Start the platform using `./start-email-platform.sh`
   - Send an email to the configured email address
   - The Email MCP will check for new emails every 60 seconds
   - Once received, emails will appear in the dashboard

### Using with Docker

When using Docker, make sure to update the `docker-compose.yml` file with your email credentials by adding them as environment variables for the `email-mcp` service.

## License

This project is licensed under the MIT License. 