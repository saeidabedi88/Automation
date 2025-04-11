# Conductor MCP API Documentation

## Email Processing API

### POST /api/emails/process

Process a new email, perform intent analysis, and route it appropriately.

**Request Body:**

```json
{
  "from": "sender@example.com",
  "to": "recipient@yourcompany.com",
  "subject": "Product Inquiry",
  "text": "I'm interested in learning more about your product pricing...",
  "html": "<p>I'm interested in learning more about your product pricing...</p>",
  "cc": ["optional@example.com"],
  "bcc": ["optional-bcc@example.com"],
  "metadata": {
    "received_at": "2023-11-01T12:34:56Z",
    "source": "api"
  }
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "email_id": "ed7c9776-8954-4b38-97b9-fa1c8ae72f4b",
    "task_id": "68a6c760-3cde-4af3-b5a0-9dd4f74839d2",
    "classification": {
      "intent": "inquiry",
      "risk_level": "low",
      "confidence": 0.95
    },
    "processing_status": "routed_to_email_mcp"
  }
}
```

### GET /api/emails/:id/classification

Get the classification results for a specific email.

**Response:**

```json
{
  "status": "success",
  "data": {
    "id": "bf29b1a4-fcbe-4a24-a4f0-72a74a789e07",
    "email_id": "ed7c9776-8954-4b38-97b9-fa1c8ae72f4b",
    "intent": "inquiry",
    "risk_level": "low",
    "confidence": 0.95,
    "metadata": {
      "analysis_method": "llm",
      "model_used": "gpt-4-turbo",
      "key_topics": ["pricing", "product features", "availability"],
      "keywords": ["pricing", "product", "interested", "learn"],
      "explanation": "The email is asking about product pricing without any urgent language or sensitive topics",
      "analysis_timestamp": "2023-11-01T12:35:01Z"
    },
    "created_at": "2023-11-01T12:35:01Z"
  }
}
```

## Intent Analysis API

### POST /api/intent/analyze

Analyze text content to determine intent and risk level.

**Request Body:**

```json
{
  "subject": "Product Inquiry",
  "content": "I'm interested in learning more about your product pricing...",
  "from": "sender@example.com"
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "intent": "inquiry",
    "risk_level": "low",
    "confidence": 0.95,
    "analysis": {
      "method": "llm",
      "model_used": "gpt-4-turbo",
      "key_topics": ["pricing", "product features", "availability"],
      "explanation": "The email is asking about product pricing without any urgent language or sensitive topics"
    }
  }
}
```

### GET /api/intent/metrics

Get performance metrics for the intent analysis service.

**Response:**

```json
{
  "status": "success",
  "data": {
    "avg_confidence": 0.92,
    "total_classifications": 1250,
    "llm_count": 1100,
    "rule_based_count": 150,
    "avg_processing_time_seconds": 0.42,
    "cache_hits": 324,
    "cache_misses": 926,
    "cache_keys": 450
  }
}
```

## Email Retrieval API

### GET /api/emails/:id

Get details for a specific email.

**Response:**

```json
{
  "status": "success",
  "data": {
    "id": "ed7c9776-8954-4b38-97b9-fa1c8ae72f4b",
    "from_address": "sender@example.com",
    "to_address": "recipient@yourcompany.com",
    "subject": "Product Inquiry",
    "content_text": "I'm interested in learning more about your product pricing...",
    "content_html": "<p>I'm interested in learning more about your product pricing...</p>",
    "received_at": "2023-11-01T12:34:56Z",
    "cc": ["optional@example.com"],
    "bcc": ["optional-bcc@example.com"],
    "metadata": {
      "source": "api"
    },
    "classification": {
      "intent": "inquiry",
      "risk_level": "low",
      "confidence": 0.95
    },
    "task_status": "completed",
    "created_at": "2023-11-01T12:34:56Z",
    "updated_at": "2023-11-01T12:35:10Z"
  }
}
```

## Task Management API

### GET /api/tasks/:id

Get details for a specific task.

**Response:**

```json
{
  "status": "success",
  "data": {
    "id": "68a6c760-3cde-4af3-b5a0-9dd4f74839d2",
    "email_id": "ed7c9776-8954-4b38-97b9-fa1c8ae72f4b",
    "type": "email_processing",
    "status": "completed",
    "steps": [
      {
        "name": "email_received",
        "status": "completed",
        "timestamp": "2023-11-01T12:34:56Z"
      },
      {
        "name": "intent_analysis",
        "status": "completed",
        "timestamp": "2023-11-01T12:35:01Z",
        "metadata": {
          "method": "llm",
          "confidence": 0.95
        }
      },
      {
        "name": "routed_to_email_mcp",
        "status": "completed",
        "timestamp": "2023-11-01T12:35:02Z"
      },
      {
        "name": "response_generated",
        "status": "completed",
        "timestamp": "2023-11-01T12:35:08Z"
      }
    ],
    "metadata": {
      "response_id": "4e72b890-3a2c-42d8-9b9c-f61a7321ef4b"
    },
    "created_at": "2023-11-01T12:34:56Z",
    "updated_at": "2023-11-01T12:35:10Z"
  }
}
```

## Health Check API

### GET /api/health

Get the health status of the Conductor MCP.

**Response:**

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "uptime": 12345,
  "timestamp": "2023-11-01T12:40:00Z",
  "services": {
    "database": "connected",
    "mongodb": "connected",
    "message_queue": "connected",
    "openai_api": "connected"
  },
  "metrics": {
    "email_processing_rate": "45/minute",
    "avg_classification_time": "420ms",
    "cache_hit_rate": "26%"
  }
}
```

## Error Responses

All API endpoints follow a consistent error response format:

```json
{
  "status": "error",
  "message": "Descriptive error message",
  "error_code": "ERROR_CODE",
  "details": {
    "field": "Additional error details if available"
  }
}
```

Common HTTP status codes:
- `400`: Bad Request - Invalid input
- `401`: Unauthorized - Authentication required
- `404`: Not Found - Resource not found
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Server failure

## Content Types

All API endpoints accept and return `application/json` content type. 