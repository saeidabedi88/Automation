import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container, Paper, Typography } from '@mui/material';

const AuthLayout = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) => `linear-gradient(45deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
        padding: (theme) => theme.spacing(2),
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={12}
          sx={{
            padding: (theme) => theme.spacing(4),
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 4,
            }}
          >
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{ fontWeight: 600 }}
            >
              Email Automation Platform
            </Typography>
            <Typography
              variant="subtitle1"
              color="text.secondary"
              align="center"
              gutterBottom
            >
              Intelligent email management for your business
            </Typography>
          </Box>
          
          <Outlet />
        </Paper>
      </Container>
    </Box>
  );
};

export default AuthLayout; 