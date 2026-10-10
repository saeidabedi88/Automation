import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  TextField,
  Typography,
  Alert,
  Stack,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';
import { inboxService } from '../../services/api';
import ApiErrorMessage from '../common/ApiErrorMessage';

const urgencyColor = {
  high: 'error',
  normal: 'info',
  low: 'default',
};

const InboxBriefPanel = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [selectedId, setSelectedId] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [editedBody, setEditedBody] = useState('');

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery(
    ['inbox-unread'],
    () => inboxService.getUnreadBriefs({ refresh: true }),
    { refetchInterval: 120000 }
  );

  const draftMutation = useMutation(
    ({ emailId, notes }) => inboxService.generateDraft(emailId, notes),
    {
      onSuccess: (result) => {
        queryClient.invalidateQueries(['inbox-unread']);
        setEditedBody(result?.data?.draftReply?.body || '');
        enqueueSnackbar('Draft reply ready', { variant: 'success' });
      },
      onError: (err) => {
        enqueueSnackbar(err?.response?.data?.message || 'Failed to draft reply', { variant: 'error' });
      },
    }
  );

  const decisionMutation = useMutation(
    ({ emailId, payload }) => inboxService.recordDecision(emailId, payload),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['inbox-unread']);
        enqueueSnackbar('Decision saved', { variant: 'success' });
        setSelectedId(null);
        setDecisionNotes('');
        setEditedBody('');
      },
      onError: (err) => {
        enqueueSnackbar(err?.response?.data?.message || 'Decision failed', { variant: 'error' });
      },
    }
  );

  const items = data?.data?.items || [];
  const selected = items.find((item) => item.id === selectedId) || null;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <ApiErrorMessage
        error={error}
        onRetry={() => refetch()}
        message="Failed to load unread email briefs"
      />
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h2">
            Unread Inbox Briefs
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Fresh summaries from your connected Gmail and other inboxes. Decide, draft, then send.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={isFetching ? <CircularProgress size={18} /> : <RefreshIcon />}
          onClick={() => refetch()}
          disabled={isFetching}
        >
          Refresh
        </Button>
      </Box>

      {data?.data?.errors?.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Some accounts failed to sync:{' '}
          {data.data.errors.map((e) => e.email).join(', ')}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Stack spacing={2}>
            {items.length === 0 && (
              <Alert severity="info">No unread emails right now.</Alert>
            )}
            {items.map((item) => (
              <Card
                key={item.id}
                variant="outlined"
                sx={{
                  cursor: 'pointer',
                  borderColor: selectedId === item.id ? 'primary.main' : 'divider',
                  bgcolor: selectedId === item.id ? 'action.selected' : 'background.paper',
                }}
                onClick={() => {
                  setSelectedId(item.id);
                  setDecisionNotes(item.decision?.notes || '');
                  setEditedBody(item.draftReply?.body || '');
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle2" noWrap>
                      {item.from}
                    </Typography>
                    <Chip
                      size="small"
                      label={item.brief?.urgency || 'normal'}
                      color={urgencyColor[item.brief?.urgency] || 'default'}
                    />
                  </Box>
                  <Typography variant="subtitle1" gutterBottom>
                    {item.subject}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {item.brief?.summary}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.accountLabel || item.accountEmail} ·{' '}
                    {item.date ? format(new Date(item.date), 'PPp') : 'Unknown date'}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Grid>

        <Grid item xs={12} md={7}>
          {!selected ? (
            <Alert severity="info">Select an unread email to review the brief and decide how to reply.</Alert>
          ) : (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {selected.subject}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  From {selected.from}
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom>
                  Brief
                </Typography>
                <Typography variant="body1" paragraph>
                  {selected.brief?.summary}
                </Typography>
                {selected.brief?.keyPoints?.length > 0 && (
                  <Box component="ul" sx={{ mt: 0, pl: 2 }}>
                    {selected.brief.keyPoints.map((point) => (
                      <li key={point}>
                        <Typography variant="body2">{point}</Typography>
                      </li>
                    ))}
                  </Box>
                )}
                <Chip
                  label={`Suggested: ${selected.brief?.suggestedAction || 'review'}`}
                  size="small"
                  sx={{ mb: 2 }}
                />

                <Typography variant="subtitle2" gutterBottom>
                  Your decision notes
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  placeholder="e.g. Accept the meeting for Tuesday afternoon and ask for an agenda."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    disabled={draftMutation.isLoading}
                    onClick={() =>
                      draftMutation.mutate({ emailId: selected.id, notes: decisionNotes })
                    }
                  >
                    Draft reply from my notes
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() =>
                      decisionMutation.mutate({
                        emailId: selected.id,
                        payload: { action: 'skip', notes: decisionNotes, sendImmediately: false },
                      })
                    }
                  >
                    Skip
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={() =>
                      decisionMutation.mutate({
                        emailId: selected.id,
                        payload: { action: 'archive', notes: decisionNotes, sendImmediately: false },
                      })
                    }
                  >
                    Mark handled
                  </Button>
                </Stack>

                {(editedBody || selected.draftReply?.body) && (
                  <>
                    <Typography variant="subtitle2" gutterBottom>
                      Draft reply
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      minRows={8}
                      value={editedBody || selected.draftReply?.body || ''}
                      onChange={(e) => setEditedBody(e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        color="success"
                        disabled={decisionMutation.isLoading}
                        onClick={() =>
                          decisionMutation.mutate({
                            emailId: selected.id,
                            payload: {
                              action: 'edit_send',
                              notes: decisionNotes,
                              editedBody: editedBody || selected.draftReply?.body,
                              sendImmediately: true,
                            },
                          })
                        }
                      >
                        Approve & send
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() =>
                          decisionMutation.mutate({
                            emailId: selected.id,
                            payload: {
                              action: 'needs_info',
                              notes: decisionNotes,
                              editedBody,
                              sendImmediately: false,
                            },
                          })
                        }
                      >
                        Needs more info
                      </Button>
                    </Stack>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default InboxBriefPanel;
