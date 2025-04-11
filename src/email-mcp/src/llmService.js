/**
 * Mock LLM Service - For testing without OpenAI API
 */
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

/**
 * Generate a mock response to an email based on its intent
 * @param {Object} emailData - Email data including content, intent, and metadata
 * @param {Array} history - Previous email exchanges in the thread
 * @param {Object} templates - Relevant response templates for this intent
 * @returns {Promise<Object>} Generated response
 */
async function generateEmailResponse(emailData, history = [], templates = []) {
  try {
    const { content, classification, metadata } = emailData;
    const { intent, risk_level } = classification;
    
    logger.info(`Generating mock response for email with intent: ${intent}`);
    
    // Use the first template if available, or generate a generic response
    let responseBody = '';
    
    if (templates && templates.length > 0) {
      responseBody = templates[0].content;
    } else {
      // Generate generic responses based on intent
      const responses = {
        'technical_issue': 'Thank you for reporting this technical issue. Our engineering team is looking into this problem and we\'ll update you as soon as we have more information.',
        'pricing_question': 'Thank you for your inquiry about pricing. I\'d be happy to clarify our pricing structure for you. The enterprise tier does include full API access with up to 100,000 requests per month.',
        'account_access': 'I\'m sorry to hear you\'re having trouble accessing your account. I\'ve reset your account access and you should receive a password reset email shortly.',
        'refund_request': 'Thank you for your refund request. I\'ve processed the refund for your order, and you should see the credit back on your original payment method within 3-5 business days.',
        'feedback': 'Thank you for your feedback! We appreciate you taking the time to share your thoughts with us. Your input helps us improve our services.',
        'general': 'Thank you for your email. We appreciate your interest in our services. Please let us know if you have any other questions or concerns.'
      };
      
      responseBody = responses[intent] || responses['general'];
    }
    
    return {
      body: responseBody,
      model_used: 'mock-model',
      finish_reason: 'mock-completion',
      token_usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };
  } catch (error) {
    logger.error(`Error generating mock email response: ${error.message}`);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}

/**
 * Always returns success for mock implementation
 * @returns {Promise<boolean>} Always returns true
 */
async function checkApiStatus() {
  logger.info('Mock LLM service is always available');
  return true;
}

module.exports = {
  generateEmailResponse,
  checkApiStatus
}; 