# Conductor MCP (Message Control Program)

The Conductor MCP is the central orchestration engine of the Email Automation Platform, responsible for intent analysis, classification, and routing of emails to the appropriate processing service.

## Architecture

The Conductor MCP implements a microservice architecture with several key components:

### Core Components

- **Intent Analysis Engine**: Advanced LLM-powered system for accurate email intent classification
- **Email Service**: Manages email reception, parsing, and storage
- **Routing Service**: Directs emails to the appropriate processing service based on classification
- **Task Management**: Tracks and monitors email processing tasks

### Technology Stack

- **Runtime**: Node.js with Express
- **Database**: PostgreSQL for structured data, MongoDB for logs
- **Message Queue**: RabbitMQ for asynchronous communication
- **LLM Integration**: OpenAI GPT for intent analysis
- **Logging**: Winston for structured logging

## Intent Analysis System

The Conductor MCP features a sophisticated intent analysis system that combines:

1. **LLM-Powered Classification**: Uses OpenAI's models to accurately determine email intent and risk level
2. **Confidence Scoring**: Provides reliability metrics for each classification
3. **Performance Optimization**: Implements caching and batching for efficient API usage
4. **Fallback Mechanisms**: Gracefully degrades to rule-based classification if needed

### Classification Categories

The system classifies emails into the following intents:
- Support requests
- Product inquiries
- Complaints
- Feedback
- Order-related
- Business partnerships
- Other

### Risk Assessment

Each email is assigned a risk level:
- **Low**: Routine emails that can be auto-processed
- **Medium**: Emails requiring some care but suitable for automated handling
- **High**: Complex or sensitive communications requiring human review

## API Reference

### Email Processing Endpoints

- `POST /api/emails/process`: Submit an email for processing
- `GET /api/emails/:id`: Retrieve email details
- `GET /api/emails/:id/classification`: Get classification results for an email
- `GET /api/emails/:id/history`: Get processing history for an email

### Task Management Endpoints

- `GET /api/tasks`: List all tasks
- `GET /api/tasks/:id`: Get task details
- `PUT /api/tasks/:id/status`: Update task status

## Integration

The Conductor MCP integrates with:

- **Email MCP**: For generating email responses based on classification
- **Dashboard**: For human review of high-risk emails
- **Email Servers**: For receiving and sending emails

## Setup & Configuration

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables (see `.env.example`)
4. Initialize database: `npm run init-db`
5. Start the service: `npm run dev`

## Environment Variables

- `PORT`: Server port (default: 3001)
- `POSTGRES_URI`: PostgreSQL connection string
- `MONGODB_URI`: MongoDB connection string
- `RABBITMQ_URI`: RabbitMQ connection string
- `EMAIL_MCP_URL`: URL of the Email MCP service
- `OPENAI_API_KEY`: API key for OpenAI
- `OPENAI_MODEL`: Model to use for classification (default: gpt-4-turbo)

## Performance Characteristics

- **Throughput**: Processes up to 100 emails/minute
- **Latency**: Classification in <500ms average
- **Accuracy**: >95% intent classification accuracy
- **Resource Usage**: ~512MB RAM base, scales with load

## Monitoring & Troubleshooting

The service exposes health and metrics endpoints:
- `GET /api/health`: Service health information
- `GET /api/metrics`: Performance metrics

## License

Proprietary - All rights reserved 