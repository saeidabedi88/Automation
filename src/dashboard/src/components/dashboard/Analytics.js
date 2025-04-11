import React from 'react';
import { useQuery } from 'react-query';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  LinearProgress,
  Divider,
  Button,
  Avatar,
  useTheme,
} from '@mui/material';
import {
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { emailService } from '../../services/api';
import ApiErrorMessage from '../common/ApiErrorMessage';

// Register Chart.js components
Chart.register(...registerables);

const Analytics = ({ onReviewEmail }) => {
  const theme = useTheme();
  
  // Fetch email analytics data
  const { data: analyticsData, isLoading, refetch, error } = useQuery(
    'emailAnalytics',
    () => emailService.getAnalytics(),
    {
      refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
      retry: false,
      useErrorBoundary: false,
      onError: (err) => {
        console.error("Analytics query error:", err);
      }
    }
  );
  
  // Configure chart options and data
  const pieOptions = {
    plugins: {
      legend: {
        position: 'right',
      },
    },
    maintainAspectRatio: false,
  };
  
  const barOptions = {
    plugins: {
      legend: {
        position: 'top',
      },
    },
    responsive: true,
    scales: {
      x: {
        stacked: false,
      },
      y: {
        stacked: false,
      },
    },
    maintainAspectRatio: false,
  };
  
  const intentChartData = {
    labels: analyticsData?.intentDistribution?.labels || [],
    datasets: [
      {
        data: analyticsData?.intentDistribution?.data || [],
        backgroundColor: [
          theme.palette.primary.main,
          theme.palette.secondary.main,
          theme.palette.error.main,
          theme.palette.success.main,
          theme.palette.warning.main,
          theme.palette.info.main,
          '#9e9e9e',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  const riskChartData = {
    labels: analyticsData?.riskDistribution?.labels || [],
    datasets: [
      {
        data: analyticsData?.riskDistribution?.data || [],
        backgroundColor: [
          theme.palette.success.main,
          theme.palette.warning.main,
          theme.palette.error.main,
        ],
        borderWidth: 1,
      },
    ],
  };
  
  const volumeChartData = {
    labels: analyticsData?.dailyVolume?.labels || [],
    datasets: [
      {
        label: 'Auto-Responded',
        data: analyticsData?.dailyVolume?.autoResponded || [],
        backgroundColor: theme.palette.success.light,
        borderColor: theme.palette.success.main,
        borderWidth: 2,
      },
      {
        label: 'Human Reviewed',
        data: analyticsData?.dailyVolume?.humanReviewed || [],
        backgroundColor: theme.palette.primary.light,
        borderColor: theme.palette.primary.main,
        borderWidth: 2,
      },
    ],
  };
  
  // Format trend indicator
  const formatTrend = (value) => {
    const formattedValue = ((value || 0) * 100).toFixed(1);
    if (value > 0) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
          <ArrowUpwardIcon fontSize="small" sx={{ mr: 0.5 }} />
          <Typography variant="body2">{formattedValue}%</Typography>
        </Box>
      );
    } else if (value < 0) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
          <ArrowDownwardIcon fontSize="small" sx={{ mr: 0.5 }} />
          <Typography variant="body2">{Math.abs(formattedValue)}%</Typography>
        </Box>
      );
    }
    return <Typography variant="body2">0%</Typography>;
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Analytics Overview
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => refetch()}
          disabled={isLoading}
          size="small"
        >
          Refresh
        </Button>
      </Box>
      
      {isLoading && <LinearProgress sx={{ mb: 3 }} />}
      
      {error && (
        <ApiErrorMessage 
          error={error} 
          onRetry={() => refetch()} 
          message="Failed to load analytics data" 
        />
      )}
      
      {analyticsData && (
        <Grid container spacing={3}>
          {/* Total Emails */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    <EmailIcon />
                  </Avatar>
                  <Typography variant="h6">Total Emails</Typography>
                </Box>
                <Typography variant="h3" component="div" sx={{ mb: 1 }}>
                  {analyticsData?.emailCounts?.total?.toLocaleString() || '0'}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Today: {analyticsData?.emailCounts?.today?.toLocaleString() || '0'}
                  </Typography>
                  {formatTrend(analyticsData?.emailCounts?.trend)}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Auto-Processed */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                    <CheckCircleIcon />
                  </Avatar>
                  <Typography variant="h6">Auto-Processed</Typography>
                </Box>
                <Typography variant="h3" component="div" sx={{ mb: 1 }}>
                  {analyticsData?.emailCounts?.auto_processed?.toLocaleString() || '0'}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    {analyticsData?.emailCounts?.auto_processed && analyticsData?.emailCounts?.total
                      ? `${Math.round((analyticsData.emailCounts.auto_processed / analyticsData.emailCounts.total) * 100)}% of total`
                      : 'NaN% of total'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Pending Review */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                    <WarningIcon />
                  </Avatar>
                  <Typography variant="h6">Pending Review</Typography>
                </Box>
                <Typography variant="h3" component="div" sx={{ mb: 1 }}>
                  {analyticsData?.emailCounts?.pending_review?.toLocaleString() || '0'}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    size="small"
                    color="primary"
                    onClick={onReviewEmail}
                    disabled={!onReviewEmail}
                  >
                    View All
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Analytics; 