import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  Typography,
  Divider,
  Menu,
  MenuItem,
  Avatar,
  Badge
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  AccountCircle,
  Notifications as NotificationsIcon
} from '@mui/icons-material';

const MainLayout = () => {
  const theme = useTheme();
  const location = useLocation();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState(null);
  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleNotificationsOpen = (event) => {
    setNotificationsAnchorEl(event.currentTarget);
  };
  
  const handleNotificationsClose = () => {
    setNotificationsAnchorEl(null);
  };
  
  // Mock user for demonstration
  const mockUser = {
    name: 'Demo User',
    email: 'demo@example.com',
    avatar: null
  };
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Email Automation Platform
          </Typography>
          
          {/* Notifications */}
          <IconButton 
            color="inherit" 
            onClick={handleNotificationsOpen}
            sx={{ ml: 1 }}
          >
            <Badge badgeContent={3} color="secondary">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <Menu
            anchorEl={notificationsAnchorEl}
            open={Boolean(notificationsAnchorEl)}
            onClose={handleNotificationsClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleNotificationsClose}>
              <Typography variant="body2">New high-risk email requires review</Typography>
            </MenuItem>
            <MenuItem onClick={handleNotificationsClose}>
              <Typography variant="body2">Customer complaint needs attention</Typography>
            </MenuItem>
            <MenuItem onClick={handleNotificationsClose}>
              <Typography variant="body2">3 new emails processed in the last hour</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleNotificationsClose}>
              <Typography variant="body2" sx={{ color: 'primary.main' }}>See all notifications</Typography>
            </MenuItem>
          </Menu>
          
          {/* User menu */}
          <IconButton
            color="inherit"
            onClick={handleMenuOpen}
            sx={{ ml: 1 }}
          >
            {mockUser?.avatar ? (
              <Avatar
                src={mockUser.avatar}
                alt={mockUser.name}
                sx={{ width: 32, height: 32 }}
              />
            ) : (
              <AccountCircle />
            )}
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleMenuClose}>
              <Typography variant="body2">{mockUser.name}</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleMenuClose}>
              <SettingsIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body2">Settings</Typography>
            </MenuItem>
            <MenuItem onClick={handleMenuClose}>
              <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body2">Logout</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      <Box
        component="main"
        sx={{
          backgroundColor: (theme) => theme.palette.background.default,
          flexGrow: 1,
          overflow: 'auto',
          width: '100%',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout; 