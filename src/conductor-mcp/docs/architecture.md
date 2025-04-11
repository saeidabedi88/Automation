# Conductor MCP Architecture

## Overview

The Conductor MCP serves as the central orchestration engine of the Email Automation Platform, responsible for receiving emails, analyzing intent, classifying risk levels, and routing to the appropriate processing service.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       Conductor MCP                             │
│                                                                 │
│  ┌───────────┐     ┌──────────────────┐     ┌───────────────┐   │
│  │           │     │                  │     │               │   │
│  │  Email    │────▶│  Intent Analysis │────▶│   Routing     │   │
│  │  Service  │     │  Service (LLM)   │     │   Service     │   │
│  │           │     │                  │     │               │   │
│  └───────────┘     └──────────────────┘     └───────┬───────┘   │
│        ▲                     │                      │           │
│        │                     │                      │           │
└────────┼─────────────────────┼──────────────────────┼───────────┘
         │                     │                      │
         │                     ▼                      ▼
┌────────┴─────────┐  ┌────────────────┐    ┌─────────────────┐
│                  │  │                │    │                 │
│   Email Server   │  │  OpenAI API    │    │   Email MCP     │
│                  │  │                │    │                 │
└──────────────────┘  └────────────────┘    └─────────────────┘
```

## Component Descriptions

### Email Service

- Responsible for receiving emails via SMTP or API endpoints
- Parses and validates email content
- Stores emails in the database
- Initiates the email processing workflow

### Intent Analysis Service

The Intent Analysis Service classifies emails using a hybrid approach, combining LLM-powered classification with traditional rule-based methods for resilience and efficiency.

#### LLM Integration

- **Primary Classifier**: OpenAI's GPT model provides high-accuracy intent and risk classification
- **Prompt Engineering**: Specialized prompts extract intent, risk level, and key topics
- **JSON Response Format**: Structured output with intent, risk level, confidence, and explanation
- **Performance Optimization**:
  - Result caching (1-hour TTL)
  - Input truncation to manage token usage
  - Low temperature setting for consistent results
  - Lightweight response format

#### Fallback Mechanism

- Rule-based classification as backup when LLM is unavailable or fails
- Keyword matching for intent categorization
- Pattern recognition for risk assessment
- Lower confidence scores reflect reduced accuracy

#### Classification Categories

The system classifies emails into the following intents:
- `support`: Technical support requests
- `inquiry`: Questions about products/services
- `complaint`: Expressions of dissatisfaction
- `feedback`: General comments or praise
- `order`: Order-related communications
- `partnership`: Business partnership requests
- `other`: Miscellaneous communications

Each email is assigned a risk level:
- `low`: Routine, safe for auto-processing
- `medium`: Requires care but suitable for automation
- `high`: Complex or sensitive, requiring human review

### Routing Service

- Routes classified emails to the Email MCP with classification data
- Manages message queue communication
- Tracks email processing status
- Handles failure recovery and retries

## Data Flow

1. **Email Reception**: Email Service receives an incoming email
2. **Storage**: Email is stored in PostgreSQL database
3. **Intent Analysis**: 
   - LLM classification attempt via OpenAI API
   - Result validation and sanitization
   - Fallback to rule-based classification if needed
4. **Classification Storage**: Result saved to database
5. **Routing**: Email routed to Email MCP with classification data
6. **Task Tracking**: Processing status tracked until completion

## Performance Characteristics

- **Classification Latency**: <500ms average with LLM
- **Throughput**: Up to 100 emails/minute
- **Classification Accuracy**: >95% with LLM, ~80% with rule-based
- **Cache Hit Rate**: Typically 15-20% for similar emails
- **Resource Usage**: ~100-200 MB RAM for the service plus cache

## Implementation Details

### LLM Request Format

```javascript
// System prompt (abbreviated)
const systemPrompt = `
  You are an email intent classification system. Analyze the email provided and determine:
  1. The primary intent of the email
  2. The risk level associated with the email
  
  Classify the intent as one of the following:
  - support: Technical support requests
  ...
  
  Provide your analysis in JSON format with the following fields:
  - intent: the classified intent
  - risk_level: the risk assessment
  - confidence: your confidence in this classification
  - explanation: brief explanation
  - key_topics: array of key topics
`;
```

### LLM Response Format

```json
{
  "intent": "inquiry",
  "risk_level": "low",
  "confidence": 0.92,
  "explanation": "The email is asking about product pricing and availability without any urgent language or sensitive topics",
  "key_topics": ["pricing", "product features", "availability"]
}
```

## Monitoring and Metrics

The Intent Analysis Service exposes the following metrics:
- Average classification confidence
- Classification method distribution (LLM vs. rule-based)
- Average processing time
- Cache performance
- Error rates by type

## Error Handling

The system implements comprehensive error handling:
- LLM timeouts trigger fallback to rule-based classification
- Invalid LLM responses are sanitized or rejected
- Classification failures are logged and monitored
- Rate limiting prevents API abuse

## Future Enhancements

- Fine-tuning OpenAI models on our email dataset
- Implementing embedding-based similar email detection
- Adding more specialized classification categories
- Incorporating feedback loops for continuous improvement 