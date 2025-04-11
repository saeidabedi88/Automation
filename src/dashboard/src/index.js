import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components to avoid errors
Chart.register(...registerables);

// Add environment variable logging for debugging
console.log('Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('REACT_APP_RAG_API_URL:', process.env.REACT_APP_RAG_API_URL);
console.log('REACT_APP_USE_MOCK_DATA:', process.env.REACT_APP_USE_MOCK_DATA);
console.log('REACT_APP_VERSION:', process.env.REACT_APP_VERSION);

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 