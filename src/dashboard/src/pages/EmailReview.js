import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Grid,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  IconButton,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Send as SendIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';
import apiService, { emailService } from '../services/api';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`email-tabpanel-${index}`}
      aria-labelledby={`email-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const EmailReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  
  const [tabValue, setTabValue] = useState(0);
  const [responseText, setResponseText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedResponseTemplate, setSelectedResponseTemplate] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  
  // Fetch email data
  const {
    data: emailData,
    isLoading: emailLoading,
    error: emailError,
  } = useQuery(['email', id], () => emailService.getEmailById(id), {
    onSuccess: (data) => {
      console.log('Email data:', data);
    },
  });
  
  // Fetch classification data
  const {
    data: classificationData,
    isLoading: classificationLoading,
  } = useQuery(
    ['classification', id],
    () => emailService.getEmailClassification(id),
    {
      enabled: !!emailData,
    }
  );
  
  // Fetch response options
  const {
    data: responseOptions,
    isLoading: responseOptionsLoading,
  } = useQuery(
    ['responseOptions', id],
    () => emailService.getResponseOptions(id),
    {
      enabled: !!emailData,
    }
  );
  
  // Submit response mutation
  const submitResponseMutation = useMutation(
    (responseData) => emailService.submitResponse(id, responseData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['email', id]);
        enqueueSnackbar('Response submitted successfully', { variant: 'success' });
        navigate('/emails');
      },
      onError: (error) => {
        console.error('Error submitting response:', error);
        enqueueSnackbar('Failed to submit response', { variant: 'error' });
      },
    }
  );
  
  // Save draft mutation
  const saveDraftMutation = useMutation(
    (draftData) => emailService.saveDraftResponse(id, draftData),
    {
      onSuccess: () => {
        enqueueSnackbar('Draft saved successfully', { variant: 'success' });
      },
      onError: (error) => {
        console.error('Error saving draft:', error);
        enqueueSnackbar('Failed to save draft', { variant: 'error' });
      },
    }
  );
  
  // Effect to set initial response text from template if available
  useEffect(() => {
    if (responseOptions?.templates?.length > 0 && !responseText) {
      // Find best matching template based on classification
      const bestTemplate = responseOptions.templates.find(
        (template) => template.intent === classificationData?.data?.intent
      ) || responseOptions.templates[0];
      
      setSelectedResponseTemplate(bestTemplate);
      setResponseText(bestTemplate.content);
    }
  }, [responseOptions, classificationData, responseText]);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Handle response template selection
  const handleTemplateSelect = (template) => {
    setSelectedResponseTemplate(template);
    setResponseText(template.content);
    setIsEditing(true);
  };
  
  // Handle save draft
  const handleSaveDraft = () => {
    saveDraftMutation.mutate({
      response: {
        body: responseText,
        subject: emailData?.data?.subject ? `Re: ${emailData.data.subject}` : 'Re: Your email',
      },
      template_id: selectedResponseTemplate?.id || null,
    });
  };
  
  // Handle submit response
  const handleSubmitResponse = () => {
    setConfirmDialogOpen(true);
  };
  
  // Confirm submission
  const confirmSubmit = () => {
    setConfirmDialogOpen(false);
    submitResponseMutation.mutate({
      response: {
        body: responseText,
        subject: emailData?.data?.subject ? `Re: ${emailData.data.subject}` : 'Re: Your email',
      },
      template_id: selectedResponseTemplate?.id || null,
      status: 'approved',
    });
  };
  
  // Loading state
  if (emailLoading || classificationLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Error state
  if (emailError) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Error loading email: {emailError.message}
      </Alert>
    );
  }
  
  // If we have email data, render the review interface
  const email = emailData?.data;
  const classification = classificationData?.data;
  
  return (
    <Box>
      {/* Header with back button */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          onClick={() => navigate('/emails')} 
          sx={{ mr: 2 }}
          aria-label="back to emails"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          Review Email
        </Typography>
      </Box>
      
      {/* Main content */}
      <Grid container spacing={3}>
        {/* Left column: Email content and metadata */}
        <Grid item xs={12} md={7}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    From: {email?.from_address}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    To: {email?.to_address}
                  </Typography>
                  {email?.cc && email.cc.length > 0 && (
                    <Typography variant="subtitle2" color="text.secondary">
                      CC: {email.cc.join(', ')}
                    </Typography>
                  )}
                  <Typography variant="subtitle2" color="text.secondary">
                    Date: {email?.received_at ? format(new Date(email.received_at), 'PPpp') : 'Unknown'}
                  </Typography>
                </Box>
                
                {/* Intent and risk badges */}
                <Box>
                  {classification && (
                    <>
                      <Chip
                        label={`Intent: ${classification.intent}`}
                        color="primary"
                        size="small"
                        sx={{ mr: 1, mb: 1 }}
                      />
                      <Chip
                        label={`Risk: ${classification.risk_level}`}
                        color={
                          classification.risk_level === 'high'
                            ? 'error'
                            : classification.risk_level === 'medium'
                            ? 'warning'
                            : 'success'
                        }
                        icon={
                          classification.risk_level === 'high' ? (
                            <WarningIcon />
                          ) : classification.risk_level === 'medium' ? (
                            <InfoIcon />
                          ) : (
                            <CheckCircleIcon />
                          )
                        }
                        size="small"
                        sx={{ mb: 1 }}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                          Confidence:
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={classification.confidence * 100}
                          sx={{ width: 80, height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          {Math.round(classification.confidence * 100)}%
                        </Typography>
                      </Box>
                    </>
                  )}
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                {email?.subject || '(No subject)'}
              </Typography>
              
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mt: 2,
                  bgcolor: 'background.default',
                  minHeight: 200,
                  maxHeight: 400,
                  overflow: 'auto',
                }}
              >
                {email?.content_html ? (
                  <div dangerouslySetInnerHTML={{ __html: email.content_html }} />
                ) : (
                  <Typography
                    variant="body1"
                    sx={{ whiteSpace: 'pre-wrap' }}
                  >
                    {email?.content_text || 'No content'}
                  </Typography>
                )}
              </Paper>
            </CardContent>
          </Card>
          
          {/* Classification details */}
          {classification && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Classification Details
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Key Topics:</strong>{' '}
                    {classification.metadata?.key_topics?.join(', ') || 'None detected'}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Analysis:</strong>{' '}
                    {classification.metadata?.explanation || 'No explanation provided'}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    <strong>Analysis Method:</strong>{' '}
                    {classification.metadata?.analysis_method === 'llm' 
                      ? 'AI-powered classification' 
                      : 'Rule-based classification'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
        
        {/* Right column: Response composition */}
        <Grid item xs={12} md={5}>
          <Card>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="email response tabs"
              >
                <Tab label="Response Editor" id="email-tab-0" />
                <Tab label="Templates" id="email-tab-1" />
              </Tabs>
            </Box>
            
            {/* Response editor tab */}
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Compose Response
                  </Typography>
                  <Button
                    startIcon={<EditIcon />}
                    onClick={() => setIsEditing(!isEditing)}
                    color="primary"
                    variant={isEditing ? "contained" : "outlined"}
                    size="small"
                  >
                    {isEditing ? "Editing" : "Edit"}
                  </Button>
                </Box>
                
                <TextField
                  fullWidth
                  multiline
                  rows={12}
                  variant="outlined"
                  placeholder="Compose your response here..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  disabled={!isEditing}
                  sx={{ mb: 3 }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveDraft}
                    disabled={saveDraftMutation.isLoading || !responseText}
                  >
                    {saveDraftMutation.isLoading ? (
                      <CircularProgress size={24} />
                    ) : (
                      'Save Draft'
                    )}
                  </Button>
                  
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SendIcon />}
                    onClick={handleSubmitResponse}
                    disabled={
                      submitResponseMutation.isLoading || !responseText
                    }
                  >
                    {submitResponseMutation.isLoading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      'Send Response'
                    )}
                  </Button>
                </Box>
              </Box>
            </TabPanel>
            
            {/* Templates tab */}
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Response Templates
                </Typography>
                
                {responseOptionsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : responseOptions?.templates?.length > 0 ? (
                  <Box>
                    {responseOptions.templates.map((template) => (
                      <Card
                        key={template.id}
                        variant="outlined"
                        sx={{
                          mb: 2,
                          cursor: 'pointer',
                          borderColor:
                            selectedResponseTemplate?.id === template.id
                              ? 'primary.main'
                              : 'divider',
                          '&:hover': {
                            borderColor: 'primary.main',
                          },
                        }}
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom>
                            {template.name}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              maxHeight: 100,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {template.content}
                          </Typography>
                          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                            <Chip
                              label={template.intent}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ mr: 1 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              Used: {template.usage_count || 0} times
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                ) : (
                  <Alert severity="info">
                    No templates available for this email type.
                  </Alert>
                )}
              </Box>
            </TabPanel>
          </Card>
        </Grid>
      </Grid>
      
      {/* Confirmation dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Confirm Response</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to send this response? Once sent, it cannot be recalled.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmDialogOpen(false)} 
            startIcon={<CancelIcon />}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmSubmit} 
            color="primary" 
            variant="contained"
            startIcon={<SendIcon />}
          >
            Confirm Send
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Linear progress component for confidence display
const LinearProgress = ({ value, ...props }) => {
  return (
    <Box sx={{ width: '100%', ...props.sx }}>
      <Box
        sx={{
          height: props.sx?.height || 4,
          width: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          borderRadius: props.sx?.borderRadius || 0,
          position: 'relative',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            top: 0,
            width: `${value}%`,
            backgroundColor: (theme) => {
              if (value < 33) return theme.palette.error.main;
              if (value < 66) return theme.palette.warning.main;
              return theme.palette.success.main;
            },
            borderRadius: props.sx?.borderRadius || 0,
            transition: 'width 0.4s ease-in-out',
          }}
        />
      </Box>
    </Box>
  );
};

export default EmailReview; 