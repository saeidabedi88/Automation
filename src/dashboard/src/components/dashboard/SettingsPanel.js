import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
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
  Stack,
  Chip,
} from '@mui/material';
import { Save as SaveIcon, Link as LinkIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { accountService } from '../../services/api';

const emptyAccountForm = {
  label: '',
  email: '',
  password: '',
  provider: 'gmail',
  imapHost: '',
  imapPort: '',
  smtpHost: '',
  smtpPort: '',
};

const SettingsPanel = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [settings, setSettings] = useState({
    autoProcessLowRisk: true,
    autoProcessMediumRisk: false,
    responseConfidenceThreshold: 0.8,
    defaultResponseSignature: 'Best regards,\nThe Support Team',
    emailNotifications: true,
    desktopNotifications: true,
    notificationFrequency: 'immediate',
    apiEndpoint: 'http://localhost:3001/api',
    maxConcurrentRequests: 5,
  });

  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const providersQuery = useQuery(['account-providers'], () => accountService.getProviders());
  const accountsQuery = useQuery(['accounts'], () => accountService.list());

  const providers = providersQuery.data?.data || {};
  const accounts = accountsQuery.data?.data || [];

  useEffect(() => {
    const preset = providers[accountForm.provider];
    if (!preset) return;
    setAccountForm((prev) => ({
      ...prev,
      imapHost: prev.provider === 'custom' ? prev.imapHost : preset.imapHost,
      imapPort: prev.provider === 'custom' ? prev.imapPort : String(preset.imapPort || ''),
      smtpHost: prev.provider === 'custom' ? prev.smtpHost : preset.smtpHost,
      smtpPort: prev.provider === 'custom' ? prev.smtpPort : String(preset.smtpPort || ''),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountForm.provider, providersQuery.data]);

  const connectMutation = useMutation((payload) => accountService.connect(payload), {
    onSuccess: () => {
      queryClient.invalidateQueries(['accounts']);
      setAccountForm(emptyAccountForm);
      enqueueSnackbar('Email account connected', { variant: 'success' });
    },
    onError: (err) => {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to connect account', {
        variant: 'error',
      });
    },
  });

  const deleteMutation = useMutation((id) => accountService.remove(id), {
    onSuccess: () => {
      queryClient.invalidateQueries(['accounts']);
      enqueueSnackbar('Account removed', { variant: 'success' });
    },
    onError: (err) => {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to remove account', {
        variant: 'error',
      });
    },
  });

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
    setTimeout(() => {
      setIsSaving(false);
      setSuccessMessage('Settings saved successfully!');
    }, 1000);
  };

  const handleCloseSnackbar = () => {
    setSuccessMessage('');
  };

  const handleConnectAccount = () => {
    connectMutation.mutate({
      label: accountForm.label || accountForm.email,
      email: accountForm.email,
      password: accountForm.password,
      provider: accountForm.provider,
      imapHost: accountForm.imapHost || undefined,
      imapPort: accountForm.imapPort ? parseInt(accountForm.imapPort, 10) : undefined,
      smtpHost: accountForm.smtpHost || undefined,
      smtpPort: accountForm.smtpPort ? parseInt(accountForm.smtpPort, 10) : undefined,
    });
  };

  const providerHelp = providers[accountForm.provider]?.help;

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
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Connected email accounts
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Connect Gmail (App Password), Outlook, Yahoo, iCloud, or any IMAP mailbox.
                Unread mail from these accounts appears under Inbox Briefs.
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={1} sx={{ mb: 3 }}>
                {accounts.length === 0 && (
                  <Alert severity="info">No accounts connected yet.</Alert>
                )}
                {accounts.map((account) => (
                  <Box
                    key={account.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 2,
                      p: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2">
                        {account.label}{' '}
                        <Chip size="small" label={account.provider} sx={{ ml: 1 }} />
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {account.email}
                        {account.lastError ? ` · ${account.lastError}` : ''}
                      </Typography>
                    </Box>
                    <Button
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => deleteMutation.mutate(account.id)}
                    >
                      Remove
                    </Button>
                  </Box>
                ))}
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="provider-label">Provider</InputLabel>
                    <Select
                      labelId="provider-label"
                      label="Provider"
                      value={accountForm.provider}
                      onChange={(e) =>
                        setAccountForm({ ...accountForm, provider: e.target.value })
                      }
                    >
                      {Object.entries(providers).map(([key, value]) => (
                        <MenuItem key={key} value={key}>
                          {value.label || key}
                        </MenuItem>
                      ))}
                      {Object.keys(providers).length === 0 && (
                        <>
                          <MenuItem value="gmail">Gmail</MenuItem>
                          <MenuItem value="outlook">Outlook</MenuItem>
                          <MenuItem value="yahoo">Yahoo</MenuItem>
                          <MenuItem value="icloud">iCloud</MenuItem>
                          <MenuItem value="custom">Custom</MenuItem>
                        </>
                      )}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Label"
                    value={accountForm.label}
                    onChange={(e) => setAccountForm({ ...accountForm, label: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Email"
                    value={accountForm.email}
                    onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="password"
                    label="App password"
                    value={accountForm.password}
                    onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                  />
                </Grid>
                {accountForm.provider === 'custom' && (
                  <>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="IMAP host"
                        value={accountForm.imapHost}
                        onChange={(e) =>
                          setAccountForm({ ...accountForm, imapHost: e.target.value })
                        }
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="SMTP host"
                        value={accountForm.smtpHost}
                        onChange={(e) =>
                          setAccountForm({ ...accountForm, smtpHost: e.target.value })
                        }
                      />
                    </Grid>
                  </>
                )}
              </Grid>

              {providerHelp && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {providerHelp}
                </Alert>
              )}

              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  startIcon={
                    connectMutation.isLoading ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <LinkIcon />
                    )
                  }
                  disabled={
                    !accountForm.email || !accountForm.password || connectMutation.isLoading
                  }
                  onClick={handleConnectAccount}
                >
                  Connect account
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

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
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>Response Confidence Threshold</Typography>
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
              </Box>

              <Box>
                <Typography gutterBottom>Default Response Signature</Typography>
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
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Notifications
              </Typography>
              <Divider sx={{ mb: 2 }} />

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

              <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                <InputLabel id="notification-frequency-label">Notification Frequency</InputLabel>
                <Select
                  labelId="notification-frequency-label"
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
