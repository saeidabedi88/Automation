import React from 'react';
import { Alert, Button, Box, Typography } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

/**
 * A component to display API errors with retry functionality
 * 
 * @param {Object} props
 * @param {Error} props.error - The error object
 * @param {Function} props.onRetry - Function to call when retry button is clicked
 * @param {string} props.message - Optional custom message to display
 * @param {string} props.severity - The severity level (error, warning, info, success)
 * @param {Object} props.sx - Additional styles to apply
 */
const ApiErrorMessage = ({ 
  error, 
  onRetry, 
  message = 'Failed to load data', 
  severity = 'error',
  sx = {} 
}) => {
  // Get a user-friendly error message
  const getErrorMessage = () => {
    if (!error) return message;
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 401) {
        return 'Authentication error. Please log in again.';
      } else if (status === 403) {
        return 'You do not have permission to access this resource.';
      } else if (status === 404) {
        return 'The requested resource was not found.';
      } else if (status === 500) {
        return 'An internal server error occurred. Please try again later.';
      } else if (data && data.message) {
        return data.message;
      }
    } else if (error.request) {
      // The request was made but no response was received
      return 'No response from server. Please check your connection.';
    }
    
    // Something happened in setting up the request that triggered an Error
    return error.message || message;
  };

  return (
    <Box sx={{ my: 2, ...sx }}>
      <Alert 
        severity={severity}
        icon={<ErrorOutline />}
        action={
          onRetry && (
            <Button 
              color="inherit" 
              size="small" 
              onClick={onRetry}
              startIcon={<Refresh />}
            >
              Retry
            </Button>
          )
        }
      >
        <Typography variant="body1">{getErrorMessage()}</Typography>
        {process.env.NODE_ENV === 'development' && error && (
          <Typography variant="caption" component="pre" sx={{ mt: 1, overflowX: 'auto' }}>
            {JSON.stringify(error.response?.data || error.message, null, 2)}
          </Typography>
        )}
      </Alert>
    </Box>
  );
};

export default ApiErrorMessage; 