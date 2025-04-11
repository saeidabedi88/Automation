import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent, CardHeader, Chip, IconButton, Tooltip } from '@mui/material';
import { useQuery } from 'react-query';
import { Refresh as RefreshIcon, CheckCircle as CheckIcon, Error as ErrorIcon, Warning as WarningIcon } from '@mui/icons-material';
import { emailService } from '../../services/api';
import { useSnackbar } from 'notistack';
import Analytics from './Analytics';
import EmailProcessor from './EmailProcessor';

const Dashboard = () => {
  const { enqueueSnackbar } = useSnackbar();

  // Check RAG server health
  const {
    data: ragHealth,
    isLoading: isRagHealthLoading,
    error: ragHealthError,
    refetch: refetchRagHealth
  } = useQuery(
    ['ragHealth'],
    () => emailService.checkRagHealth(),
    {
      refetchInterval: 300000, // 5 minutes
      onError: (err) => {
        enqueueSnackbar('RAG server health check failed: ' + err.message, { variant: 'warning' });
      }
    }
  );

  // Health status component
  const HealthStatus = ({ label, status, error }) => {
    const getStatusColor = () => {
      if (error) return 'error';
      if (status === 'success' || status === 'healthy') return 'success';
      if (status === 'warning') return 'warning';
      return 'default';
    };

    const getStatusIcon = () => {
      if (error) return <ErrorIcon fontSize="small" />;
      if (status === 'success' || status === 'healthy') return <CheckIcon fontSize="small" />;
      return <WarningIcon fontSize="small" />;
    };

    return (
      <Tooltip title={error ? error.message : `Status: ${status}`}>
        <Chip
          icon={getStatusIcon()}
          label={label}
          color={getStatusColor()}
          variant="outlined"
          size="small"
        />
      </Tooltip>
    );
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Email Automation Dashboard
            </Typography>
            <Box>
              <HealthStatus 
                label="RAG Server" 
                status={ragHealth?.status}
                error={ragHealthError}
              />
              <Tooltip title="Refresh health status">
                <IconButton 
                  size="small" 
                  onClick={() => refetchRagHealth()}
                  disabled={isRagHealthLoading}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Analytics />
          </Paper>
          <Paper sx={{ p: 2 }}>
            <EmailProcessor />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 