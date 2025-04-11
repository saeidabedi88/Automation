/**
 * Configuration for the RAG server
 */
require('dotenv').config();

const config = {
  // Server
  server: {
    port: process.env.PORT || 3003,
    env: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  },
  
  // Database
  db: {
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/email-rag'
    },
    chroma: {
      host: process.env.CHROMA_HOST || 'localhost',
      port: process.env.CHROMA_PORT || 8000,
      collection: process.env.CHROMA_COLLECTION || 'email-rag'
    }
  },
  
  // LLM/Embedding
  llm: {
    openAiApiKey: process.env.OPENAI_API_KEY,
    embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
    completionModel: process.env.COMPLETION_MODEL || 'gpt-3.5-turbo-16k'
  },
  
  // Security
  security: {
    apiKeySecret: process.env.API_KEY_SECRET,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiration: process.env.JWT_EXPIRATION || '24h'
  },
  
  // Email MCP Integration
  integration: {
    emailMcpApiUrl: process.env.EMAIL_MCP_API_URL || 'http://localhost:3001/api',
    conductorApiUrl: process.env.CONDUCTOR_API_URL || 'http://localhost:3002/api'
  },
  
  // Feature flags
  features: {
    useMockData: process.env.USE_MOCK_DATA === 'true',
    enableCaching: process.env.ENABLE_CACHING === 'true',
    cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '300', 10)
  },
  
  // RAG settings
  rag: {
    chunkSize: parseInt(process.env.CHUNK_SIZE || '200', 10),
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '50', 10),
    defaultMaxResults: parseInt(process.env.DEFAULT_MAX_RESULTS || '5', 10),
    defaultThreshold: parseFloat(process.env.DEFAULT_THRESHOLD || '0.7')
  }
};

module.exports = config; 