import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography, Paper } from '@mui/material';
import AnalyticsIcon from '@mui/icons-material/BarChart';
import EmailIcon from '@mui/icons-material/Email';
import SettingsIcon from '@mui/icons-material/Settings';

// Import our components
import Analytics from '../components/dashboard/Analytics';
import EmailProcessor from '../components/dashboard/EmailProcessor';
import SettingsPanel from '../components/dashboard/SettingsPanel';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && (
        <Box sx={{ p: 3, height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `dashboard-tab-${index}`,
    'aria-controls': `dashboard-tabpanel-${index}`,
  };
}

const UnifiedDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedEmail, setSelectedEmail] = useState(null);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <Paper sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          aria-label="dashboard tabs"
          variant="fullWidth"
        >
          <Tab 
            icon={<AnalyticsIcon />} 
            label="Analytics Dashboard" 
            {...a11yProps(0)} 
          />
          <Tab 
            icon={<EmailIcon />} 
            label="Email Processing" 
            {...a11yProps(1)} 
          />
          <Tab 
            icon={<SettingsIcon />} 
            label="Settings" 
            {...a11yProps(2)} 
          />
        </Tabs>
      </Paper>
      
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <TabPanel value={activeTab} index={0}>
          <Analytics />
        </TabPanel>
        
        <TabPanel value={activeTab} index={1}>
          <EmailProcessor 
            selectedEmail={selectedEmail} 
            setSelectedEmail={setSelectedEmail} 
          />
        </TabPanel>
        
        <TabPanel value={activeTab} index={2}>
          <SettingsPanel />
        </TabPanel>
      </Box>
    </Box>
  );
};

export default UnifiedDashboard;