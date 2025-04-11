import React, { useState } from 'react';
import { useQuery } from 'react-query';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { emailService } from '../../services/api';
import ApiErrorMessage from '../common/ApiErrorMessage';

/**
 * RagContextPanel component for retrieving and displaying relevant context
 * from the RAG server for email responses
 */
const RagContextPanel = ({ emailId, onUseContent }) => {
  const [contextQuery, setContextQuery] = useState('');
  
  // Fetch RAG context based on the query
  const {
    data: contextData,
    isLoading,
    error,
    refetch,
    isSuccess
  } = useQuery(
    ['emailContext', emailId, contextQuery],
    () => emailService.getContextForEmail(emailId, contextQuery),
    {
      enabled: Boolean(contextQuery && contextQuery.trim().length > 3),
      onError: (err) => {
        console.error('RAG context error:', err);
      },
    }
  );

  // Handle context search submission
  const handleContextSearch = (e) => {
    e.preventDefault();
    if (contextQuery.trim().length > 3) {
      refetch();
    }
  };

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

      {/* Search input */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Search for Relevant Context
        </Typography>
        <form onSubmit={handleContextSearch}>
          <Box sx={{ display: 'flex', mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="What are our API limits for enterprise tier?"
              value={contextQuery}
              onChange={(e) => setContextQuery(e.target.value)}
              sx={{ mr: 1 }}
              disabled={healthError || healthLoading}
            />
            <Button
              type="submit"
              variant="contained"
              startIcon={<SearchIcon />}
              disabled={contextQuery.trim().length < 3 || isLoading || healthError || healthLoading}
            >
              Search
            </Button>
          </Box>
        </form>
      </Box>

      {/* Error handling */}
      {error && (
        <ApiErrorMessage 
          error={error}
          onRetry={refetch}
          message="Failed to fetch context information"
        />
      )}

      {/* Loading state */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Results */}
      {isSuccess && contextData && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Relevant Context
          </Typography>
          {contextData.results && contextData.results.length > 0 ? (
            <Box>
              {contextData.results.map((item) => (
                <Paper key={item.id} sx={{ p: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Chip 
                      size="small" 
                      label={item.metadata.source || 'knowledge base'} 
                      color="primary" 
                      variant="outlined" 
                    />
                    <Chip 
                      size="small" 
                      label={`Score: ${(item.metadata.score * 100).toFixed(0)}%`} 
                      color={item.metadata.score > 0.8 ? 'success' : 'default'} 
                      variant="outlined" 
                    />
                  </Box>
                  <Typography variant="body2">{item.content}</Typography>
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button 
                      size="small" 
                      onClick={() => onUseContent(item.content)}
                    >
                      Use in Response
                    </Button>
                  </Box>
                </Paper>
              ))}
            </Box>
          ) : (
            <Alert severity="info">
              No relevant context found. Try a different query.
            </Alert>
          )}
        </Box>
      )}

      {/* Initial state */}
      {!contextQuery && (
        <Alert severity="info">
          Enter a query to search for relevant information from the knowledge base.
        </Alert>
      )}

      {/* Health error */}
      {healthError && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          RAG service is currently unavailable. Context search will be disabled.
        </Alert>
      )}
    </Box>
  );
};

export default RagContextPanel; 