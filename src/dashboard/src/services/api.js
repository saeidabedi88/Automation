import axios from 'axios';

// Base API URL from environment variables or default to localhost
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const RAG_API_URL = process.env.REACT_APP_RAG_API_URL || 'http://localhost:3003/api';

// Add timestamp to force cache busting
const CACHE_BUSTER = process.env.REACT_APP_CACHE_BUSTER || Date.now();

console.log('=== API CONFIGURATION ===');
console.log('API_URL:', API_URL);
console.log('RAG_API_URL:', RAG_API_URL);
console.log('CACHE_BUSTER:', CACHE_BUSTER);
console.log('REACT_APP_USE_MOCK_DATA:', process.env.REACT_APP_USE_MOCK_DATA);
console.log('========================');

// Create an axios instance with default config for main API
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add cache busting parameter to all requests
  params: {
    _t: CACHE_BUSTER
  }
});

// Create a separate axios instance for RAG API
const ragApi = axios.create({
  baseURL: RAG_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add cache busting parameter to all requests
  params: {
    _t: CACHE_BUSTER
  }
});

// Add request interceptor to include auth token for main API
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add request interceptor to include auth token for RAG API
ragApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for handling errors for main API
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Enhanced error logging
    console.error('API Error:', error.message);
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request setup error:', error.message);
    }
    console.error('Error config:', error.config?.url);
    
    // Handle authentication errors
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Add response interceptor for handling errors for RAG API
ragApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Enhanced error logging
    console.error('RAG API Error:', error.message);
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received');
    }
    
    return Promise.reject(error);
  }
);

// Email service
const emailService = {
  // Get emails requiring review
  getEmailsForReview: async (params = {}) => {
    const response = await api.get('/emails', { params });
    return response.data;
  },
  
  // Get email by ID
  getEmailById: async (id) => {
    const response = await api.get(`/emails/${id}`);
    return response.data;
  },
  
  // Get email classification
  getEmailClassification: async (id) => {
    const response = await api.get(`/emails/${id}/classification`);
    return response.data;
  },
  
  // Get response options/templates
  getResponseOptions: async (emailId) => {
    const response = await api.get(`/emails/${emailId}/response-options`);
    return response.data;
  },
  
  // Submit response
  submitResponse: async (emailId, responseData) => {
    const response = await api.post('/responses', { 
      email_id: emailId, 
      ...responseData 
    });
    return response.data;
  },
  
  // Save draft response
  saveDraftResponse: async (emailId, draftData) => {
    const response = await api.post('/responses/draft', { 
      email_id: emailId, 
      ...draftData 
    });
    return response.data;
  },
  
  // Update task status
  updateTask: async (taskId, status) => {
    const response = await api.patch(`/tasks/${taskId}`, { status });
    return response.data;
  },
  
  // Get analytics data
  getAnalytics: async () => {
    const response = await api.get('/analytics');
    return response.data;
  },
  
  // Get email templates
  getTemplates: async () => {
    const response = await api.get('/templates');
    return response.data;
  },
  
  // Get template by ID
  getTemplateById: async (id) => {
    const response = await api.get(`/templates/${id}`);
    return response.data;
  },
  
  // Create template
  createTemplate: async (templateData) => {
    const response = await api.post('/templates', templateData);
    return response.data;
  },
  
  // Update template
  updateTemplate: async (id, templateData) => {
    const response = await api.put(`/templates/${id}`, templateData);
    return response.data;
  },
  
  // Delete template
  deleteTemplate: async (id) => {
    const response = await api.delete(`/templates/${id}`);
    return response.data;
  }
};

// RAG service
const ragService = {
  // Get context from RAG API
  getContext: async (query, options = {}) => {
    const response = await ragApi.post('/query', {
      query,
      ...options
    });
    return response.data;
  },
  
  // Add document to knowledge base
  addDocument: async (document) => {
    const response = await ragApi.post('/documents', document);
    return response.data;
  },
  
  // Get documents
  getDocuments: async (params = {}) => {
    const response = await ragApi.get('/documents', { params });
    return response.data;
  },
  
  // Delete document
  deleteDocument: async (id) => {
    const response = await ragApi.delete(`/documents/${id}`);
    return response.data;
  },
  
  // Get knowledge bases
  getKnowledgeBases: async () => {
    const response = await ragApi.get('/knowledge-bases');
    return response.data;
  }
};

// Authentication service
const authService = {
  // Login
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    const { token } = response.data;
    if (token) {
      localStorage.setItem('authToken', token);
    }
    return response.data;
  },
  
  // Logout
  logout: () => {
    localStorage.removeItem('authToken');
  },
  
  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },
  
  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

// Settings service
const settingsService = {
  // Get settings
  getSettings: async () => {
    const response = await api.get('/settings');
    return response.data;
  },
  
  // Update settings
  updateSettings: async (settings) => {
    const response = await api.put('/settings', settings);
    return response.data;
  }
};

export {
  emailService,
  ragService,
  authService,
  settingsService
}; 