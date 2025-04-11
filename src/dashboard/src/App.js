import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';

// Layout
import MainLayout from './components/layouts/MainLayout';

// Pages
import UnifiedDashboard from './pages/UnifiedDashboard';
import EmailProcessorPage from './components/pages/EmailProcessorPage';
import SettingsPage from './components/pages/SettingsPage';
import NotFound from './pages/NotFound';

// Create a client for React Query with better error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: process.env.REACT_APP_USE_MOCK_DATA === 'true' ? 0 : 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      onError: (error) => {
        console.error('Query error:', error);
        // When using mock data, we want to suppress error notifications
        if (process.env.REACT_APP_USE_MOCK_DATA !== 'true') {
          // You could add global error notification here if needed
        }
      },
      // Ensure errors don't propagate to the UI when using mock data
      useErrorBoundary: process.env.REACT_APP_USE_MOCK_DATA === 'true' ? false : undefined,
    },
    mutations: {
      onError: (error) => console.error('Mutation error:', error),
    }
  },
});

// Create theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider
          maxSnack={3}
          autoHideDuration={3000}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<UnifiedDashboard />} />
                <Route path="emails" element={<EmailProcessorPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </SnackbarProvider>
      </ThemeProvider>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App; 