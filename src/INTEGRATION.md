# RAG Integration Guide

This document explains how the Email Automation Dashboard integrates with the RAG (Retrieval-Augmented Generation) server for enhanced email processing capabilities.

## Overview

The integration between the dashboard and RAG server provides:

1. **Context-aware email processing**: Retrieve relevant information when responding to emails
2. **Knowledge base storage**: Store important email content for future reference
3. **Health monitoring**: Monitor the status of the RAG service

## Architecture

The system consists of:

1. **Email Automation Dashboard**: React application for managing and responding to emails
2. **RAG Server**: Node.js/Express API for handling context retrieval and storage
3. **Vector Database**: (Simulated in development) Stores embeddings for semantic search

## Setup and Running

### Configuration

1. Configure the dashboard's connection to the RAG server in `.env`:
   ```
   REACT_APP_RAG_API_URL=http://localhost:3003/api
   REACT_APP_USE_MOCK_DATA=false  # Set to true for development without the RAG server
   ```

2. Configure the RAG server (optional) in `src/rag-server/.env`:
   ```
   PORT=3003
   LOG_LEVEL=info
   NODE_ENV=development
   ```

### Starting the Services

Use the provided starter script to run both services:

```bash
./src/start-services.sh
```

This script:
- Starts the dashboard on http://localhost:3000
- Starts the RAG server on http://localhost:3003
- Handles dependencies installation if needed
- Provides graceful shutdown with Ctrl+C

### Manual Start

If you prefer to start services individually:

#### Dashboard
```bash
cd src/dashboard
npm install
npm start
```

#### RAG Server
```bash
cd src/rag-server
npm install
npm run dev
```

## Features and Usage

### Context Retrieval

When reviewing an email in the dashboard:

1. Navigate to the "Context" tab
2. Enter a search query related to the email
3. View relevant information from the knowledge base
4. Click "Use in Response" to insert content into your response

### Knowledge Storage

To store important email content:

1. When reviewing an email, navigate to the "Store Knowledge" tab
2. Select a category and importance level
3. Add custom tags to improve searchability
4. Click "Store in Knowledge Base"

### Health Monitoring

Both the Context Retrieval and Knowledge Storage components display the RAG service health status, indicating whether the service is online or offline.

## Development and Testing

During development, you can:

1. Set `REACT_APP_USE_MOCK_DATA=true` to work without a running RAG server
2. The dashboard will use mock data for all RAG operations in this mode
3. UI components still function as they would with a real RAG server

## Troubleshooting

| Issue | Solution |
|-------|----------|
| RAG service shows as offline | Check that the RAG server is running on port 3003 |
| Can't retrieve context | Verify the query is at least 3 characters and specific |
| Storage failures | Check console logs for detailed error information |
| CORS errors | Ensure the RAG server's CORS settings allow requests from the dashboard |

## Extending the Integration

To extend the RAG capabilities:

1. Add new endpoints to `src/rag-server/src/routes/rag.js`
2. Implement corresponding services in `src/rag-server/src/services/ragService.js`
3. Add new methods to `src/dashboard/src/services/api.js` to call the new endpoints
4. Create or update UI components to use the new functionality 