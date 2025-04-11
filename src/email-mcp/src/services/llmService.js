/**
 * LLM Service - Handles interactions with OpenAI API
 */
const { OpenAI } = require('openai');
const winston = require('winston');

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/llm-service-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/llm-service-combined.log' })
  ]
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate a response to an email based on its intent, content, and history
 * @param {Object} emailData - Email data including content, intent, and metadata
 * @param {Array} history - Previous email exchanges in the thread
 * @param {Object} templates - Relevant response templates for this intent
 * @returns {Promise<Object>} Generated response
 */
async function generateEmailResponse(emailData, history = [], templates = []) {
  try {
    const { content, classification, metadata } = emailData;
    const { intent, risk_level } = classification;
    
    // Create system message based on intent
    const systemMessage = createSystemPrompt(intent, risk_level, templates);
    
    // Create user message with email content and context
    const userMessage = createUserMessage(content, history, metadata);
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });
    
    logger.info(`Generated response for email with intent: ${intent}`);
    
    return {
      body: response.choices[0].message.content,
      model_used: response.model,
      finish_reason: response.choices[0].finish_reason,
      token_usage: response.usage
    };
  } catch (error) {
    logger.error(`Error generating email response: ${error.message}`);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}

/**
 * Create system prompt based on intent and risk level
 * @param {string} intent - Classified intent of the email
 * @param {string} riskLevel - Risk level (low, medium, high)
 * @param {Array} templates - Available templates for this intent
 * @returns {string} System prompt
 */
function createSystemPrompt(intent, riskLevel, templates) {
  // Base system instruction
  let prompt = `You are an AI assistant helping to write email responses for a company. 
You are responding to an email with the intent: ${intent}.
The risk level for this response is: ${riskLevel}.

Your response should be:
- Professional and courteous
- Clear and concise
- Address all questions or concerns raised in the email
- Maintain a consistent tone with previous communications
- Include appropriate greeting and sign-off`;

  // Add template guidance if available
  if (templates && templates.length > 0) {
    prompt += `\n\nHere are some templates or examples that might be helpful:
${templates.map(t => `Template for ${t.purpose}:\n${t.content}`).join('\n\n')}

You don't need to follow these templates exactly, but they should guide your response structure and tone.`;
  }

  // Add risk-specific guidance
  if (riskLevel === 'high') {
    prompt += `\n\nThis is a HIGH RISK response. Be extremely careful about:
- Making any commitments
- Providing specific timeframes
- Discussing sensitive business information
- Addressing complaints or negative feedback

Your response should be more conservative and may need to mention forwarding to appropriate team members.`;
  }

  return prompt;
}

/**
 * Create user message with email content and context
 * @param {Object} content - Email content (subject, body)
 * @param {Array} history - Previous email exchanges
 * @param {Object} metadata - Additional context about the email
 * @returns {string} User message
 */
function createUserMessage(content, history, metadata) {
  let message = '';
  
  // Add email subject and body
  message += `EMAIL TO RESPOND TO:\nSubject: ${content.subject}\n\n${content.body}\n\n`;
  
  // Add history if available
  if (history && history.length > 0) {
    message += 'PREVIOUS EXCHANGES IN THIS THREAD:\n';
    history.forEach((exchange, index) => {
      message += `[${exchange.date}] ${exchange.from}: ${exchange.snippet}\n`;
    });
    message += '\n';
  }
  
  // Add contextual information if available
  if (metadata && Object.keys(metadata).length > 0) {
    message += 'ADDITIONAL CONTEXT:\n';
    
    if (metadata.customer_info) {
      const { name, account_type, relationship_duration } = metadata.customer_info;
      message += `Customer: ${name}, Account Type: ${account_type}, Relationship: ${relationship_duration}\n`;
    }
    
    if (metadata.product_info) {
      message += `Relevant Products: ${metadata.product_info.join(', ')}\n`;
    }
  }
  
  message += '\nPlease draft a response to this email.';
  
  return message;
}

/**
 * Check if OpenAI API is accessible
 * @returns {Promise<boolean>} Whether the API is accessible
 */
async function checkApiStatus() {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5
    });
    
    return !!response;
  } catch (error) {
    logger.error(`Error checking OpenAI API status: ${error.message}`);
    return false;
  }
}

module.exports = {
  generateEmailResponse,
  checkApiStatus
}; 