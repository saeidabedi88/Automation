import React, { useState, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
} from '@mui/material';
import {
  Send as SendIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Storage as StorageIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';
import apiService, { emailService } from '../../services/api';
import ApiErrorMessage from '../common/ApiErrorMessage';
import RagContextPanel from './RagContextPanel';
import EmailContextStorage from './EmailContextStorage';

// Displays either the email list or detailed review
const EmailProcessor = () => {
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Reset selected email when component unmounts
  useEffect(() => {
    return () => {
      setSelectedEmail(null);
    };
  }, []);
  
  // Handle selecting an email for review
  const handleSelectEmail = (email) => {
    setSelectedEmail(email);
  };
  
  // Handle going back to the email list
  const handleBackToList = () => {
    setSelectedEmail(null);
  };
  
  return (
    <Box>
      {!selectedEmail ? (
        <EmailListView 
          onSelectEmail={handleSelectEmail} 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          page={page}
          setPage={setPage}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
        />
      ) : (
        <EmailReviewView 
          emailId={selectedEmail.id} 
          onBack={handleBackToList} 
        />
      )}
    </Box>
  );
};

// Email List View Component
const EmailListView = ({ 
  onSelectEmail, 
  searchQuery, 
  setSearchQuery, 
  page, 
  setPage, 
  rowsPerPage, 
  setRowsPerPage 
}) => {
  const { enqueueSnackbar } = useSnackbar();
  
  // Fetch emails for review
  const {
    data: emailsData,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['emails', page, rowsPerPage, searchQuery],
    () => emailService.getEmailsForReview({
      page: page + 1,
      limit: rowsPerPage,
      query: searchQuery || undefined
    }),
    {
      keepPreviousData: true,
      onError: (err) => {
        enqueueSnackbar('Failed to load emails: ' + err.message, { variant: 'error' });
      }
    }
  );
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    refetch();
  };
  
  // Get risk level color
  const getRiskColor = (level) => {
    switch (level) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'success';
    }
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Emails Requiring Review
        </Typography>
        <Button
          variant="outlined"
          startIcon={<CheckCircleIcon />}
          size="small"
          onClick={refetch}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </Box>
      
      {/* Search Bar */}
      <Paper
        component="form"
        sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', mb: 3 }}
        onSubmit={handleSearch}
      >
        <IconButton sx={{ p: '10px' }} aria-label="menu">
          <FilterListIcon />
        </IconButton>
        <TextField
          sx={{ ml: 1, flex: 1 }}
          placeholder="Search emails by subject, sender, or content"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          variant="standard"
          InputProps={{ disableUnderline: true }}
        />
        <IconButton type="submit" sx={{ p: '10px' }} aria-label="search">
          <SearchIcon />
        </IconButton>
      </Paper>
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <ApiErrorMessage 
          error={error}
          onRetry={() => refetch()}
          message="Failed to load emails"
        />
      ) : emailsData?.data?.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No emails pending review at this time.
        </Alert>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="emails table">
              <TableHead>
                <TableRow>
                  <TableCell>Subject</TableCell>
                  <TableCell>From</TableCell>
                  <TableCell>Received</TableCell>
                  <TableCell>Intent</TableCell>
                  <TableCell>Risk Level</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {emailsData?.data?.map((email) => (
                  <TableRow
                    key={email.id}
                    sx={{ '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
                  >
                    <TableCell component="th" scope="row">
                      {email.subject}
                    </TableCell>
                    <TableCell>{email.from_address}</TableCell>
                    <TableCell>
                      {format(new Date(email.received_at), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={email.classification.intent}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={email.classification.risk_level}
                        size="small"
                        color={getRiskColor(email.classification.risk_level)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => onSelectEmail(email)}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={emailsData?.meta?.total || 0}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}
    </Box>
  );
};

// Email Review View Component
const EmailReviewView = ({ emailId, onBack }) => {
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
    refetch: refetchEmail
  } = useQuery(['email', emailId], () => emailService.getEmailById(emailId));
  
  // Fetch classification data
  const {
    data: classificationData,
    isLoading: classificationLoading,
  } = useQuery(
    ['classification', emailId],
    () => emailService.getEmailClassification(emailId),
    {
      enabled: !!emailData,
    }
  );
  
  // Fetch response options
  const {
    data: responseOptions,
    isLoading: responseOptionsLoading,
  } = useQuery(
    ['responseOptions', emailId],
    () => emailService.getResponseOptions(emailId),
    {
      enabled: !!emailData,
    }
  );
  
  // Submit response mutation
  const submitResponseMutation = useMutation(
    (responseData) => emailService.submitResponse(emailId, responseData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['email', emailId]);
        enqueueSnackbar('Response submitted successfully', { variant: 'success' });
        onBack();
      },
      onError: (error) => {
        console.error('Error submitting response:', error);
        enqueueSnackbar('Failed to submit response', { variant: 'error' });
      },
    }
  );
  
  // Save draft mutation
  const saveDraftMutation = useMutation(
    (draftData) => emailService.saveDraftResponse(emailId, draftData),
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
  
  // Handle content usage from context panel
  const handleUseContent = (content) => {
    setResponseText((prev) => {
      // If there's already content, add the new content on a new line
      if (prev.trim()) {
        return `${prev}\n\n${content}`;
      }
      return content;
    });
    
    // Switch to response tab and enable editing
    setTabValue(0);
    setIsEditing(true);
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
      <ApiErrorMessage 
        error={emailError}
        onRetry={() => refetchEmail()}
        message="Failed to load email details"
      />
    );
  }
  
  // If we have email data, render the review interface
  const email = emailData?.data;
  const classification = classificationData?.data;
  
  return (
    <Box>
      {/* Header with back button */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button 
          variant="outlined"
          onClick={onBack} 
          sx={{ mr: 2 }}
        >
          Back to Email List
        </Button>
        <Typography variant="h5" component="h2">
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
                <Tab label="Context" id="email-tab-2" />
                <Tab icon={<StorageIcon />} label="Store Knowledge" id="email-tab-3" />
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
                        key={template.id || template.name}
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
            
            {/* Context tab - RagContextPanel */}
            <TabPanel value={tabValue} index={2}>
              <Box sx={{ p: 2 }}>
                <RagContextPanel 
                  emailId={emailId} 
                  onUseContent={handleUseContent} 
                />
              </Box>
            </TabPanel>

            {/* Store Knowledge tab */}
            <TabPanel value={tabValue} index={3}>
              <Box sx={{ p: 2 }}>
                <EmailContextStorage 
                  emailId={emailId}
                  emailSubject={email?.subject}
                  emailContent={email?.content_text || ''}
                />
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
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

export default EmailProcessor; 