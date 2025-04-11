# API Contracts

This document outlines the API contracts between the different components of the Email Automation Platform.

## 1. Conductor MCP → Email MCP

### 1.1 Process Email

**Endpoint:** `POST /api/emails/process`

**Purpose:** Route an email to the Email MCP for processing based on intent and risk classification.

**Request:**
```json
{
  "email_id": "string",
  "metadata": {
    "from": "string",
    "to": "string",
    "subject": "string",
    "date": "string (ISO 8601)",
    "cc": ["string"],
    "bcc": ["string"]
  },
  "content": {
    "plain_text": "string",
    "html": "string"
  },
  "classification": {
    "intent": "string (e.g., 'inquiry', 'support', 'complaint')",
    "risk_level": "string (e.g., 'low', 'high')",
    "confidence": "number (0.0-1.0)"
  },
  "history": [
    {
      "email_id": "string",
      "direction": "string (incoming/outgoing)",
      "date": "string (ISO 8601)"
    }
  ]
}
```

**Response:**
```json
{
  "status": "string (success/error)",
  "message": "string",
  "task_id": "string"
}
```

## 2. Email MCP → Conductor MCP

### 2.1 Auto Response Completed

**Endpoint:** `POST /api/responses/auto-complete`

**Purpose:** Notify the Conductor that an auto-response has been sent for a low-risk email.

**Request:**
```json
{
  "task_id": "string",
  "email_id": "string",
  "response": {
    "body": "string",
    "sent_at": "string (ISO 8601)"
  },
  "metadata": {
    "response_type": "auto",
    "templates_used": ["string"]
  }
}
```

**Response:**
```json
{
  "status": "string (success/error)",
  "message": "string"
}
```

### 2.2 Draft Response Generated

**Endpoint:** `POST /api/responses/draft`

**Purpose:** Send a generated draft response for a high-risk email to the Conductor for human review.

**Request:**
```json
{
  "task_id": "string",
  "email_id": "string",
  "draft_response": {
    "body": "string",
    "generated_at": "string (ISO 8601)"
  },
  "metadata": {
    "confidence": "number (0.0-1.0)",
    "suggestions": [
      {
        "type": "string (e.g., 'alternative_phrase', 'additional_info')",
        "content": "string"
      }
    ]
  }
}
```

**Response:**
```json
{
  "status": "string (success/error)",
  "message": "string",
  "review_id": "string"
}
```

## 3. Conductor MCP → Dashboard

### 3.1 Send Draft for Review

**Endpoint:** `POST /api/dashboard/reviews`

**Purpose:** Send a draft response to the Dashboard for human review.

**Request:**
```json
{
  "review_id": "string",
  "email_id": "string",
  "original_email": {
    "metadata": {
      "from": "string",
      "to": "string",
      "subject": "string",
      "date": "string (ISO 8601)"
    },
    "content": "string"
  },
  "draft_response": {
    "body": "string",
    "generated_at": "string (ISO 8601)"
  },
  "classification": {
    "intent": "string",
    "risk_level": "string",
    "confidence": "number (0.0-1.0)"
  },
  "history": [
    {
      "email_id": "string",
      "direction": "string (incoming/outgoing)",
      "content_preview": "string (truncated)",
      "date": "string (ISO 8601)"
    }
  ]
}
```

**Response:**
```json
{
  "status": "string (success/error)",
  "message": "string"
}
```

## 4. Dashboard → Conductor MCP

### 4.1 Submit Reviewed Response

**Endpoint:** `POST /api/responses/reviewed`

**Purpose:** Send the human-reviewed and approved response back to the Conductor.

**Request:**
```json
{
  "review_id": "string",
  "email_id": "string",
  "approved_response": {
    "body": "string",
    "approved_at": "string (ISO 8601)",
    "approved_by": "string (user_id)"
  },
  "feedback": {
    "quality_rating": "number (1-5)",
    "comments": "string",
    "edit_distance": "number"
  }
}
```

**Response:**
```json
{
  "status": "string (success/error)",
  "message": "string"
}
```

## 5. Conductor MCP → Email MCP (for reviewed responses)

### 5.1 Send Reviewed Response

**Endpoint:** `POST /api/emails/send-reviewed`

**Purpose:** Instruct the Email MCP to send a human-approved response.

**Request:**
```json
{
  "email_id": "string",
  "reviewed_response": {
    "body": "string",
    "approved_at": "string (ISO 8601)",
    "approved_by": "string (user_id)"
  },
  "metadata": {
    "reply_to": "string",
    "cc": ["string"],
    "bcc": ["string"]
  }
}
```

**Response:**
```json
{
  "status": "string (success/error)",
  "message": "string"
}
```

## 6. Common Status Endpoint

### 6.1 Health Check

**Endpoint:** `GET /api/health`

**Purpose:** Check the health status of each service.

**Response:**
```json
{
  "status": "string (healthy/unhealthy)",
  "version": "string",
  "uptime": "number (seconds)",
  "timestamp": "string (ISO 8601)",
  "details": {
    "database": "string (connected/error)",
    "message_queue": "string (connected/error)",
    "external_services": {
      "llm_api": "string (connected/error)",
      "email_server": "string (connected/error)"
    }
  }
}
```

---

These API contracts will be refined and expanded during development. Additional endpoints for authentication, configuration, and monitoring will be added as needed.