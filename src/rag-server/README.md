# RAG Server for Email Automation

This is a Retrieval-Augmented Generation (RAG) server for the Email Automation Platform. It provides contextual information retrieval for email responses and allows storing email content for future reference.

## Features

- **Semantic Search**: Find relevant information based on query content
- **Knowledge Base Storage**: Store and retrieve email content with metadata
- **Context-Aware Retrieval**: Get context relevant to specific emails
- **Health Monitoring**: API endpoint for checking service health

## Tech Stack

- **Node.js**: Server runtime
- **Express**: Web framework
- **ChromaDB** (simulated): Vector database for embeddings
- **Winston**: Logging
- **Joi**: Schema validation

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Navigate to the RAG server directory:
   ```
   cd src/rag-server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the following variables (optional):
   ```
   PORT=3003
   LOG_LEVEL=info
   NODE_ENV=development
   ```

### Running the Server

Start the server in development mode:

```
npm run dev
```

Or in production mode:

```
npm start
```

The server will be available at http://localhost:3003 (or the port specified in your environment variables).

## API Endpoints

### RAG Operations

- **POST `/api/rag/query`**: Query for relevant context
  ```json
  {
    "query": "What are our API limits?",
    "metadata": {
      "emailId": "email123",
      "intent": "pricing_question"
    },
    "options": {
      "maxResults": 5,
      "threshold": 0.7
    }
  }
  ```

- **POST `/api/rag/email-context`**: Store email content in the knowledge base
  ```json
  {
    "emailId": "email123",
    "subject": "API pricing inquiry",
    "content": "I'd like to know more about your API pricing for the enterprise tier.",
    "metadata": {
      "category": "pricing",
      "importance": "high",
      "tags": ["api", "pricing", "enterprise"]
    }
  }
  ```

- **GET `/api/rag/email-context/:id`**: Get stored context for an email

### System Health

- **GET `/api/health`**: Check the health status of the RAG server

## Integration with the Dashboard

The RAG server is designed to work with the Email Automation Dashboard. To integrate:

1. Configure the dashboard's `.env` file:
   ```
   REACT_APP_RAG_API_URL=http://localhost:3003/api
   ```

2. Set `REACT_APP_USE_MOCK_DATA=false` to use the actual RAG server instead of mock data.

3. Start both services (from project root):
   ```
   ./src/start-services.sh
   ```

## Development

### Project Structure

```
src/
├── routes/       # API routes
│   ├── rag.js    # RAG endpoints
│   └── health.js # Health check endpoint
├── services/     # Business logic
│   └── ragService.js  # RAG operations
├── utils/        # Utility functions
│   └── logger.js # Logging utility
├── app.js        # Express application
└── server.js     # Entry point
```

### Testing

Run tests:

```
npm test
```

## Production Deployment

For production deployment, you'll need to:

1. Set up a proper vector database (ChromaDB, Pinecone, etc.)
2. Update `ragService.js` to use the actual vector database implementation
3. Set environment variables for production:
   ```
   NODE_ENV=production
   PORT=3003
   LOG_LEVEL=info
   ```

## License

This project is licensed under the MIT License. 