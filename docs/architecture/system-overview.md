# System Architecture Overview

## High-Level Architecture

```
+------------------+       +---------------------+       +-----------------+
| Email/Task       | ----> |   Conductor MCP     | ----> | Intent Analysis |
| Trigger          |       | (Central Orchestrator)|      | (NLP & Risk     |
| (e.g., Email)    |       |                     |       | Classification) |
+------------------+       +---------------------+       +-----------------+
         |                          |                           |
         v                          v                           |
+------------------+       +---------------------+              |
|   Route to       |<------+   Decision Point    |<-------------+
| Email MCP (Auto) |       | (Low vs High Risk)  |
+------------------+       +---------------------+
         |                          |
         v                          v
+------------------+       +---------------------+
| Email MCP:       |       | Email MCP: Draft    |
| Auto-Response    |       | Reply Generation    |
| (Low-Risk)       |       +---------------------+
+------------------+                 |
         |                          v
         |               +-----------------------+
         |               | Conductor MCP: Logs & |
         |               | Routes for Human Review|
         |               +-----------------------+
         |                          |
         v                          v
+------------------+       +---------------------+
| Final Response   | <-----| Human Review via    |
| Sent by Email    |       | Dashboard           |
| MCP              |       +---------------------+
+------------------+
```

## Core Components

### 1. Conductor MCP
- **Role**: Central orchestrator that manages the entire workflow
- **Responsibilities**:
  - Receive incoming email triggers
  - Perform intent analysis to classify emails
  - Route emails to the Email MCP with appropriate classification
  - Forward high-risk draft responses to the dashboard for human review
  - Log all actions and maintain a feedback loop

### 2. Email MCP
- **Role**: Specialized module for processing emails
- **Responsibilities**:
  - Connect to email servers via SMTP/IMAP
  - Parse and process email content
  - Utilize LLM to generate appropriate responses
  - Handle auto-responses for low-risk emails
  - Generate draft responses for high-risk emails

### 3. Dashboard
- **Role**: User interface for human oversight
- **Responsibilities**:
  - Display high-risk emails and draft responses
  - Allow human review, editing, and approval
  - Provide analytics and performance metrics
  - Collect feedback to improve system performance

## Data Flow

1. **Email Reception**:
   - Email arrives from external source
   - Conductor MCP receives the email trigger

2. **Intent Analysis**:
   - Conductor analyzes email content using NLP
   - Determines intent and classifies risk level (low/high)

3. **Task Routing**:
   - Low-risk emails routed to Email MCP for automatic processing
   - High-risk emails routed to Email MCP for draft generation

4. **Response Generation**:
   - Email MCP leverages LLM to generate responses
   - Low-risk: Auto-response sent directly
   - High-risk: Draft response sent back to Conductor

5. **Human Review** (high-risk only):
   - Conductor routes draft to Dashboard
   - Human reviews, edits if needed, and approves
   - Approved response sent back to Email MCP

6. **Final Dispatch**:
   - Email MCP sends the final response
   - All actions logged by Conductor MCP

## Technology Stack

- **Backend Services**: Node.js/Express or Python/FastAPI
- **Database Layer**:
  - PostgreSQL for structured data (user info, email metadata)
  - MongoDB for logs and unstructured data
- **LLM Integration**: OpenAI API
- **Message Queue**: RabbitMQ/Kafka for event-driven communication
- **Frontend**: React.js with Material UI
- **Deployment**: Docker containers orchestrated with Kubernetes
- **Monitoring**: ELK stack (Elasticsearch, Logstash, Kibana)

## API Contracts

Initial API endpoints will be documented as development progresses. Key interfaces include:

- Conductor → Email MCP: Task routing with intent classification
- Email MCP → Conductor: Response delivery (auto or draft)
- Conductor → Dashboard: Draft responses for review
- Dashboard → Conductor: Approved responses

## Security Considerations

- Email content and metadata encryption
- Secure API communication with JWT authentication
- Role-based access control for dashboard
- Comprehensive audit logging
- Regular security scanning and updates 