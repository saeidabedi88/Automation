import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Snackbar
} from '@mui/material';
import { Save as SaveIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { useQuery, useMutation } from 'react-query';
import { emailService } from '../../services/api';
import ApiErrorMessage from '../common/ApiErrorMessage';

/**
 * EmailContextStorage component
 * Allows storing email content in the RAG database for future reference
 */
const EmailContextStorage = ({ emailId, emailSubject, emailContent }) => {
  const [metadata, setMetadata] = useState({
    category: 'general',
    importance: 'medium',
    customTags: ''
  });
  const [successMessage, setSuccessMessage] = useState('');

  // Check RAG server health
  const {
    data: healthData,
    isLoading: healthLoading,
    error: healthError
  } = useQuery(
    ['ragHealth'],
    () => emailService.checkRagHealth(),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2
    }
  );

  // Store email context mutation
  const storeContextMutation = useMutation(
    (data) => emailService.storeEmailContext(data),
    {
      onSuccess: (data) => {
        console.log('Successfully stored email context:', data);
        setSuccessMessage('Email content successfully stored in knowledge base');
      },
      onError: (error) => {
        console.error('Failed to store email context:', error);
      }
    }
  );

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Prepare tags from the comma-separated list
    const tags = metadata.customTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    storeContextMutation.mutate({
      emailId,
      subject: emailSubject,
      content: emailContent,
      metadata: {
        ...metadata,
        tags,
        stored_at: new Date().toISOString()
      }
    });
  };

  // Handle metadata change
  const handleMetadataChange = (e) => {
    const { name, value } = e.target;
    setMetadata(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSuccessMessage('');
  };

  return (
    <Box>
      {/* Health indicator */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ mr: 1 }}>
          RAG Service:
        </Typography>
        {healthLoading ? (
          <CircularProgress size={16} />
        ) : healthError ? (
          <Chip 
            label="Offline" 
            color="error" 
            size="small" 
            variant="outlined" 
          />
        ) : (
          <Chip 
            label="Online" 
            color="success" 
            size="small" 
            variant="outlined" 
          />
        )}
      </Box>

      {healthError ? (
        <Alert severity="error">
          The RAG service is currently unavailable. Storage functionality is disabled.
        </Alert>
      ) : (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Store Email in Knowledge Base
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Store this email content in the knowledge base for future reference when responding to similar queries.
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <form onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    name="category"
                    label="Category"
                    value={metadata.category}
                    onChange={handleMetadataChange}
                    margin="normal"
                    variant="outlined"
                    size="small"
                  >
                    <MenuItem value="general">General</MenuItem>
                    <MenuItem value="product">Product Information</MenuItem>
                    <MenuItem value="pricing">Pricing</MenuItem>
                    <MenuItem value="technical">Technical Support</MenuItem>
                    <MenuItem value="policy">Policy & Guidelines</MenuItem>
                  </TextField>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    name="importance"
                    label="Importance"
                    value={metadata.importance}
                    onChange={handleMetadataChange}
                    margin="normal"
                    variant="outlined"
                    size="small"
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </TextField>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="customTags"
                    label="Custom Tags (comma separated)"
                    value={metadata.customTags}
                    onChange={handleMetadataChange}
                    margin="normal"
                    variant="outlined"
                    size="small"
                    placeholder="api, enterprise, pricing"
                    helperText="Add relevant tags to help with future searching"
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={storeContextMutation.isLoading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
                  disabled={storeContextMutation.isLoading || healthLoading || healthError}
                >
                  {storeContextMutation.isLoading ? 'Storing...' : 'Store in Knowledge Base'}
                </Button>
              </Box>
            </form>
            
            {storeContextMutation.isError && (
              <Box sx={{ mt: 2 }}>
                <ApiErrorMessage 
                  error={storeContextMutation.error}
                  onRetry={handleSubmit}
                  message="Failed to store email in knowledge base"
                />
              </Box>
            )}
          </CardContent>
        </Card>
      )}
      
      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={successMessage}
        action={
          <Button color="inherit" size="small" onClick={handleSnackbarClose}>
            DISMISS
          </Button>
        }
      />
    </Box>
  );
};

export default EmailContextStorage; 