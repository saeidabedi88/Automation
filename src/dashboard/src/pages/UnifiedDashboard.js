import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import AnalyticsIcon from '@mui/icons-material/BarChart';
import EmailIcon from '@mui/icons-material/Email';
import InboxIcon from '@mui/icons-material/MarkEmailUnread';
import EventIcon from '@mui/icons-material/Event';
import SettingsIcon from '@mui/icons-material/Settings';

import Analytics from '../components/dashboard/Analytics';
import EmailProcessor from '../components/dashboard/EmailProcessor';
import InboxBriefPanel from '../components/dashboard/InboxBriefPanel';
import CalendarPanel from '../components/dashboard/CalendarPanel';
import SettingsPanel from '../components/dashboard/SettingsPanel';

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
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<InboxIcon />} label="Inbox Briefs" {...a11yProps(0)} />
          <Tab icon={<EventIcon />} label="Calendar" {...a11yProps(1)} />
          <Tab icon={<EmailIcon />} label="Email Processing" {...a11yProps(2)} />
          <Tab icon={<AnalyticsIcon />} label="Analytics" {...a11yProps(3)} />
          <Tab icon={<SettingsIcon />} label="Settings" {...a11yProps(4)} />
        </Tabs>
      </Paper>

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <TabPanel value={activeTab} index={0}>
          <InboxBriefPanel />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <CalendarPanel />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <EmailProcessor
            selectedEmail={selectedEmail}
            setSelectedEmail={setSelectedEmail}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <Analytics />
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <SettingsPanel />
        </TabPanel>
      </Box>
    </Box>
  );
};

export default UnifiedDashboard;
