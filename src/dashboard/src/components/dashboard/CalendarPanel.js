import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import SyncIcon from '@mui/icons-material/Sync';
import { format, formatDistanceToNow } from 'date-fns';
import { useSnackbar } from 'notistack';
import { calendarService } from '../../services/api';
import ApiErrorMessage from '../common/ApiErrorMessage';

const CalendarPanel = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [sourceForm, setSourceForm] = useState({ label: '', url: '', provider: 'ics' });
  const [eventForm, setEventForm] = useState({
    title: '',
    location: '',
    start: '',
    end: '',
    reminderMinutes: '60,15',
  });

  const upcomingQuery = useQuery(
    ['calendar-upcoming'],
    () => calendarService.getUpcoming(72),
    { refetchInterval: 60000 }
  );

  const remindersQuery = useQuery(
    ['calendar-reminders'],
    () => calendarService.getReminders(180),
    { refetchInterval: 30000 }
  );

  const sourcesQuery = useQuery(['calendar-sources'], () => calendarService.listSources());

  const syncMutation = useMutation(() => calendarService.sync(), {
    onSuccess: () => {
      queryClient.invalidateQueries(['calendar-upcoming']);
      queryClient.invalidateQueries(['calendar-sources']);
      enqueueSnackbar('Calendars synced', { variant: 'success' });
    },
    onError: (err) => {
      enqueueSnackbar(err?.response?.data?.message || 'Sync failed', { variant: 'error' });
    },
  });

  const addSourceMutation = useMutation((payload) => calendarService.addSource(payload), {
    onSuccess: () => {
      queryClient.invalidateQueries(['calendar-sources']);
      queryClient.invalidateQueries(['calendar-upcoming']);
      setSourceForm({ label: '', url: '', provider: 'ics' });
      enqueueSnackbar('Calendar connected', { variant: 'success' });
    },
    onError: (err) => {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to add calendar', { variant: 'error' });
    },
  });

  const createEventMutation = useMutation((payload) => calendarService.createEvent(payload), {
    onSuccess: () => {
      queryClient.invalidateQueries(['calendar-upcoming']);
      setEventForm({ title: '', location: '', start: '', end: '', reminderMinutes: '60,15' });
      enqueueSnackbar('Event created', { variant: 'success' });
    },
    onError: (err) => {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to create event', { variant: 'error' });
    },
  });

  const ackMutation = useMutation((key) => calendarService.acknowledgeReminder(key), {
    onSuccess: () => queryClient.invalidateQueries(['calendar-reminders']),
  });

  if (upcomingQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (upcomingQuery.error) {
    return (
      <ApiErrorMessage
        error={upcomingQuery.error}
        onRetry={() => upcomingQuery.refetch()}
        message="Failed to load calendar"
      />
    );
  }

  const upcoming = upcomingQuery.data?.data || [];
  const reminders = remindersQuery.data?.data || [];
  const sources = sourcesQuery.data?.data || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h2">
            Calendar & Reminders
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Connect a Google/Outlook secret ICS URL or add local events. Reminders surface before each meeting.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={syncMutation.isLoading ? <CircularProgress size={18} /> : <SyncIcon />}
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isLoading}
        >
          Sync calendars
        </Button>
      </Box>

      {reminders.length > 0 && (
        <Alert severity="warning" icon={<EventAvailableIcon />} sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Incoming reminders
          </Typography>
          <Stack spacing={1}>
            {reminders.map((reminder) => (
              <Box
                key={reminder.key}
                sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}
              >
                <Typography variant="body2">{reminder.message}</Typography>
                <Button size="small" onClick={() => ackMutation.mutate(reminder.key)}>
                  Dismiss
                </Button>
              </Box>
            ))}
          </Stack>
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Typography variant="h6" gutterBottom>
            Next 72 hours
          </Typography>
          <Stack spacing={2}>
            {upcoming.length === 0 && (
              <Alert severity="info">No upcoming events. Connect a calendar or add one below.</Alert>
            )}
            {upcoming.map((event) => (
              <Card key={event.id} variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="subtitle1">{event.title}</Typography>
                    <Chip
                      size="small"
                      label={formatDistanceToNow(new Date(event.start), { addSuffix: true })}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {format(new Date(event.start), 'PPpp')}
                    {event.end ? ` – ${format(new Date(event.end), 'p')}` : ''}
                  </Typography>
                  {event.location && (
                    <Typography variant="body2" color="text.secondary">
                      {event.location}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    Reminders: {(event.reminderMinutes || []).join(', ')} min before
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Connect calendar (ICS)
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Google Calendar: Settings → Integrate calendar → Secret address in iCal format.
              </Typography>
              <TextField
                fullWidth
                label="Label"
                value={sourceForm.label}
                onChange={(e) => setSourceForm({ ...sourceForm, label: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="ICS URL"
                value={sourceForm.url}
                onChange={(e) => setSourceForm({ ...sourceForm, url: e.target.value })}
                sx={{ mb: 2 }}
              />
              <Button
                variant="contained"
                disabled={!sourceForm.url || addSourceMutation.isLoading}
                onClick={() => addSourceMutation.mutate(sourceForm)}
              >
                Connect calendar
              </Button>
              <Divider sx={{ my: 2 }} />
              {sources.map((source) => (
                <Box key={source.id} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    {source.label} ·{' '}
                    {source.lastSyncedAt
                      ? `synced ${formatDistanceToNow(new Date(source.lastSyncedAt), { addSuffix: true })}`
                      : 'not synced'}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Add local event
              </Typography>
              <TextField
                fullWidth
                label="Title"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Location"
                value={eventForm.location}
                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                type="datetime-local"
                label="Start"
                InputLabelProps={{ shrink: true }}
                value={eventForm.start}
                onChange={(e) => setEventForm({ ...eventForm, start: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                type="datetime-local"
                label="End"
                InputLabelProps={{ shrink: true }}
                value={eventForm.end}
                onChange={(e) => setEventForm({ ...eventForm, end: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Reminder minutes (comma-separated)"
                value={eventForm.reminderMinutes}
                onChange={(e) => setEventForm({ ...eventForm, reminderMinutes: e.target.value })}
                sx={{ mb: 2 }}
              />
              <Button
                variant="contained"
                disabled={!eventForm.title || !eventForm.start || createEventMutation.isLoading}
                onClick={() =>
                  createEventMutation.mutate({
                    title: eventForm.title,
                    location: eventForm.location,
                    start: new Date(eventForm.start).toISOString(),
                    end: eventForm.end ? new Date(eventForm.end).toISOString() : null,
                    reminderMinutes: eventForm.reminderMinutes
                      .split(',')
                      .map((v) => parseInt(v.trim(), 10))
                      .filter((n) => !Number.isNaN(n)),
                  })
                }
              >
                Save event
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CalendarPanel;
