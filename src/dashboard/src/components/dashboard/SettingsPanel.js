import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
  TextField,
  Button,
  Grid,
  Alert,
  Snackbar,
  Slider,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  CircularProgress,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';

const SettingsPanel = () => {
  const [settings, setSettings] = useState({
    // Email Processing Settings
    autoProcessLowRisk: true,
    autoProcessMediumRisk: false,
    responseConfidenceThreshold: 0.8,
    defaultResponseSignature: 'Best regards,\nThe Support Team',
    
    // Notification Settings
    emailNotifications: true,
    desktopNotifications: true,
    notificationFrequency: 'immediate',
    
    // API Connection Settings
    apiEndpoint: 'http://localhost:3001/api',
    maxConcurrentRequests: 5,
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const handleChange = (event) => {
    const { name, value, checked } = event.target;
    setSettings({
      ...settings,
      [name]: event.target.type === 'checkbox' ? checked : value,
    });
  };
  
  const handleSliderChange = (name) => (event, newValue) => {
    setSettings({
      ...settings,
      [name]: newValue,
    });
  };
  
  const handleSave = () => {
    setIsSaving(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setSuccessMessage('Settings saved successfully!');
    }, 1000);
  };
  
  const handleCloseSnackbar = () => {
    setSuccessMessage('');
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Settings
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={isSaving ? <CircularProgress size={24} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={isSaving}
        >
          Save Settings
        </Button>
      </Box>
      
      <Grid container spacing={3}>
        {/* Email Processing Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Email Processing
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoProcessLowRisk}
                      onChange={handleChange}
                      name="autoProcessLowRisk"
                      color="primary"
                    />
                  }
                  label="Automatically process low-risk emails"
                />
                <Typography variant="caption" color="text.secondary" paragraph>
                  When enabled, emails classified as low-risk will be processed without human review.
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoProcessMediumRisk}
                      onChange={handleChange}
                      name="autoProcessMediumRisk"
                      color="primary"
                    />
                  }
                  label="Automatically process medium-risk emails"
                />
                <Typography variant="caption" color="text.secondary" paragraph>
                  When enabled, emails classified as medium-risk will be processed without human review.
                </Typography>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>
                  Response Confidence Threshold
                </Typography>
                <Slider
                  value={settings.responseConfidenceThreshold}
                  onChange={handleSliderChange('responseConfidenceThreshold')}
                  valueLabelDisplay="auto"
                  step={0.05}
                  marks={[
                    { value: 0.6, label: '0.6' },
                    { value: 0.8, label: '0.8' },
                    { value: 0.95, label: '0.95' },
                  ]}
                  min={0.6}
                  max={0.95}
                />
                <Typography variant="caption" color="text.secondary">
                  Only automatically send responses with confidence above this threshold.
                </Typography>
              </Box>
              
              <Box>
                <Typography gutterBottom>
                  Default Response Signature
                </Typography>
                <TextField
                  name="defaultResponseSignature"
                  value={settings.defaultResponseSignature}
                  onChange={handleChange}
                  multiline
                  rows={3}
                  fullWidth
                  variant="outlined"
                  size="small"
                />
                <Typography variant="caption" color="text.secondary">
                  This signature will be appended to all automatic responses.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Notification Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Notifications
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.emailNotifications}
                      onChange={handleChange}
                      name="emailNotifications"
                      color="primary"
                    />
                  }
                  label="Email Notifications"
                />
                <Typography variant="caption" color="text.secondary" paragraph>
                  Receive notifications about high-risk emails via email.
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.desktopNotifications}
                      onChange={handleChange}
                      name="desktopNotifications"
                      color="primary"
                    />
                  }
                  label="Desktop Notifications"
                />
                <Typography variant="caption" color="text.secondary" paragraph>
                  Receive desktop notifications about high-risk emails.
                </Typography>
              </Box>
              
              <Box>
                <FormControl fullWidth size="small">
                  <InputLabel id="notification-frequency-label">Notification Frequency</InputLabel>
                  <Select
                    labelId="notification-frequency-label"
                    id="notification-frequency"
                    name="notificationFrequency"
                    value={settings.notificationFrequency}
                    label="Notification Frequency"
                    onChange={handleChange}
                  >
                    <MenuItem value="immediate">Immediate</MenuItem>
                    <MenuItem value="hourly">Hourly Digest</MenuItem>
                    <MenuItem value="daily">Daily Digest</MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary">
                  How often you want to receive notifications about new emails.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* API Connection Settings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                API Connection
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Typography gutterBottom>
                    API Endpoint
                  </Typography>
                  <TextField
                    name="apiEndpoint"
                    value={settings.apiEndpoint}
                    onChange={handleChange}
                    fullWidth
                    variant="outlined"
                    size="small"
                  />
                  <Typography variant="caption" color="text.secondary">
                    The base URL for API requests.
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Typography gutterBottom>
                    Max Concurrent Requests
                  </Typography>
                  <TextField
                    name="maxConcurrentRequests"
                    value={settings.maxConcurrentRequests}
                    onChange={handleChange}
                    type="number"
                    fullWidth
                    variant="outlined"
                    size="small"
                    InputProps={{ inputProps: { min: 1, max: 20 } }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Maximum number of concurrent API requests.
                  </Typography>
                </Grid>
              </Grid>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                Changes to API settings will require a page refresh to take effect.
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        message={successMessage}
      />
    </Box>
  );
};

export default SettingsPanel; 