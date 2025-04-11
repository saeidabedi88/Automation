# Email MCP (Message Control Program)

This component is part of the Email Automation Platform, responsible for processing emails using LLM technology and managing responses.

## Features

- LLM-powered email response generation
- Template-based response customization
- Risk-level based processing (auto-send vs. human review)
- Message queue integration with Conductor MCP
- Email thread history extraction for context
- SMTP email sending

## Architecture

The Email MCP consists of several core services:

1. **LLM Service**: Integrates with OpenAI to generate email responses
2. **Email Service**: Handles email parsing, composing, and sending
3. **Template Service**: Manages response templates for different intents
4. **Processing Service**: Coordinates the email processing pipeline

## Prerequisites

- Node.js (v18+)
- PostgreSQL
- RabbitMQ
- OpenAI API key

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env` and update with your settings:
   ```
   cp src/.env.example src/.env
   ```
4. Initialize the database:
   ```
   npm run init-db
   ```

## Usage

### Development Mode

```
npm run dev
```

### Production Mode

```
npm start
```

## API Endpoints

### Email Processing

- `POST /api/emails/process`: Process an email with classification from Conductor MCP
- `POST /api/emails/review/:id`: Handle a reviewed response
- `GET /api/emails/response/:id`: Get details of a specific response

### Template Management

- `GET /api/emails/templates`: Get all email templates
- `GET /api/emails/templates/:intent`: Get templates for a specific intent
- `POST /api/emails/templates`: Create a new template
- `PUT /api/emails/templates/:id`: Update an existing template
- `DELETE /api/emails/templates/:id`: Delete a template

## Integration with Other Components

### Conductor MCP

The Email MCP receives classified emails from the Conductor MCP through RabbitMQ and processes them according to their intent and risk level.

### Dashboard

The Email MCP sends high-risk responses to the Dashboard for human review through RabbitMQ and processes the reviewed responses.

## Environment Variables

See `.env.example` for all required environment variables.

## License

Private - All rights reserved 