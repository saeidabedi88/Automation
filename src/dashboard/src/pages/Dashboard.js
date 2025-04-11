import React from 'react';
import { useQuery } from 'react-query';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Container,
  Grid,
  Paper,
  Typography,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Avatar,
  useTheme,
} from '@mui/material';
import {
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { Line, Pie, Bar } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import apiService, { emailService } from '../services/api';
import { useNavigate } from 'react-router-dom';

// Register Chart.js components
Chart.register(...registerables);

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  // Fetch email analytics data
  const { data: analyticsData, isLoading, refetch, error } = useQuery(
    'emailAnalytics',
    () => emailService.getAnalytics(),
    {
      refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
      retry: false,
      useErrorBoundary: false,
      onError: (err) => {
        console.error("Dashboard analytics query error:", err);
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
  
  const lineOptions = {
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
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
    const formattedValue = (value * 100).toFixed(1);
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
  
  // Handle refresh
  const handleRefresh = () => {
    refetch();
  };
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Email Automation Dashboard
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={isLoading}
          >
            Refresh Data
          </Button>
        </Box>
        <Typography variant="subtitle1" color="text.secondary">
          Real-time overview of your email processing metrics
        </Typography>
      </Box>
      
      {isLoading && <LinearProgress sx={{ mb: 3 }} />}
      
      {/* Summary stats cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <EmailIcon />
                </Avatar>
                <Typography variant="h6" component="div">
                  Total Emails
                </Typography>
              </Box>
              <Typography variant="h3" component="div" gutterBottom>
                {analyticsData?.emailCounts?.total.toLocaleString()}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Today: {analyticsData?.emailCounts?.today}
                </Typography>
                {formatTrend(analyticsData?.emailCounts?.trend || 0)}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <CheckCircleIcon />
                </Avatar>
                <Typography variant="h6" component="div">
                  Auto-Processed
                </Typography>
              </Box>
              <Typography variant="h3" component="div" gutterBottom>
                {analyticsData?.emailCounts?.auto_processed}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {(analyticsData?.processingMetrics?.auto_response_rate * 100).toFixed(1)}% of total
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <WarningIcon />
                </Avatar>
                <Typography variant="h6" component="div">
                  Pending Review
                </Typography>
              </Box>
              <Typography variant="h3" component="div" gutterBottom>
                {analyticsData?.emailCounts?.pending_review}
              </Typography>
              <Button
                variant="text"
                size="small"
                onClick={() => navigate('/emails')}
                sx={{ textTransform: 'none' }}
              >
                View All
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <SpeedIcon />
                </Avatar>
                <Typography variant="h6" component="div">
                  Avg. Processing
                </Typography>
              </Box>
              <Typography variant="h3" component="div" gutterBottom>
                {analyticsData?.processingMetrics?.avg_processing_time.toFixed(2)}s
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Accuracy: {(analyticsData?.processingMetrics?.classification_accuracy * 100).toFixed(1)}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Charts section */}
      <Grid container spacing={3}>
        {/* Daily volume chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader 
              title="Email Processing Volume" 
              subheader="Last 7 days"
              avatar={<BarChartIcon color="primary" />}
            />
            <Divider />
            <CardContent sx={{ height: 300 }}>
              <Bar data={volumeChartData} options={barOptions} />
            </CardContent>
          </Card>
        </Grid>
        
        {/* Emails requiring review */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardHeader 
              title="Emails Requiring Review" 
              avatar={<ErrorIcon color="error" />}
            />
            <Divider />
            <List>
              {analyticsData?.pendingReviewItems?.length > 0 ? (
                analyticsData.pendingReviewItems.map((item) => (
                  <React.Fragment key={item.id}>
                    <ListItem
                      button
                      onClick={() => navigate(`/emails/${item.id}/review`)}
                      secondaryAction={
                        <Chip
                          label={item.risk_level}
                          size="small"
                          color={
                            item.risk_level === 'high'
                              ? 'error'
                              : item.risk_level === 'medium'
                              ? 'warning'
                              : 'default'
                          }
                        />
                      }
                    >
                      <ListItemIcon>
                        <EmailIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.subject}
                        secondary={`From: ${item.from}`}
                        primaryTypographyProps={{
                          variant: 'body2',
                          noWrap: true,
                          sx: { fontWeight: 500 },
                        }}
                        secondaryTypographyProps={{
                          variant: 'caption',
                          noWrap: true,
                        }}
                      />
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))
              ) : (
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary="No emails pending review" />
                </ListItem>
              )}
              {analyticsData?.pendingReviewItems?.length > 0 && (
                <ListItem
                  button
                  onClick={() => navigate('/emails')}
                  sx={{ justifyContent: 'center' }}
                >
                  <Typography 
                    variant="body2" 
                    color="primary" 
                    sx={{ fontWeight: 500 }}
                  >
                    View All Pending Emails
                  </Typography>
                </ListItem>
              )}
            </List>
          </Card>
        </Grid>
        
        {/* Intent distribution chart */}
        <Grid item xs={12} sm={6}>
          <Card>
            <CardHeader 
              title="Intent Distribution" 
              subheader="Email classification by intent" 
              avatar={<PieChartIcon color="secondary" />}
            />
            <Divider />
            <CardContent sx={{ height: 240 }}>
              <Pie data={intentChartData} options={pieOptions} />
            </CardContent>
          </Card>
        </Grid>
        
        {/* Risk distribution chart */}
        <Grid item xs={12} sm={6}>
          <Card>
            <CardHeader 
              title="Risk Level Distribution" 
              subheader="Email classification by risk" 
              avatar={<PieChartIcon color="error" />}
            />
            <Divider />
            <CardContent sx={{ height: 240 }}>
              <Pie data={riskChartData} options={pieOptions} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

// Helper chip component for risk levels
const Chip = ({ label, size, color }) => {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 1,
        px: 1,
        py: 0.5,
        fontSize: size === 'small' ? '0.75rem' : '0.875rem',
        fontWeight: 500,
        textTransform: 'capitalize',
        backgroundColor: (theme) => 
          color === 'error' 
            ? theme.palette.error.light
            : color === 'warning'
            ? theme.palette.warning.light
            : theme.palette.grey[200],
        color: (theme) => 
          color === 'error'
            ? theme.palette.error.dark
            : color === 'warning'
            ? theme.palette.warning.dark
            : theme.palette.grey[800],
      }}
    >
      {label}
    </Box>
  );
};

export default Dashboard; 