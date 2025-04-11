import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { useSnackbar } from 'notistack';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  
  // Check if token is expired
  const isTokenExpired = (token) => {
    try {
      const decoded = jwtDecode(token);
      return decoded.exp < Date.now() / 1000;
    } catch (error) {
      return true;
    }
  };
  
  // Check for existing auth on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (token && !isTokenExpired(token)) {
          // Set axios default headers
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Get user info
          const response = await axios.get(`${API_URL}/users/me`);
          setUser(response.data);
        } else {
          // Clear invalid token
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [API_URL]);
  
  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { token, user: userData } = response.data;
      
      // Save token and user
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
      
      enqueueSnackbar('Login successful', { variant: 'success' });
      navigate('/');
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      enqueueSnackbar(error.response?.data?.message || 'Login failed', { variant: 'error' });
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    } finally {
      setLoading(false);
    }
  };
  
  // Register function
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      
      enqueueSnackbar('Registration successful! Please log in.', { variant: 'success' });
      navigate('/login');
      return { success: true };
    } catch (error) {
      console.error('Registration failed:', error);
      enqueueSnackbar(error.response?.data?.message || 'Registration failed', { variant: 'error' });
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    } finally {
      setLoading(false);
    }
  };
  
  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    navigate('/login');
    enqueueSnackbar('Logged out successfully', { variant: 'success' });
  };
  
  // Reset password request
  const requestPasswordReset = async (email) => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/auth/forgot-password`, { email });
      
      enqueueSnackbar('Password reset instructions sent to your email', { variant: 'success' });
      return { success: true };
    } catch (error) {
      console.error('Password reset request failed:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Failed to send password reset email', 
        { variant: 'error' }
      );
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to send password reset email' 
      };
    } finally {
      setLoading(false);
    }
  };
  
  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    requestPasswordReset
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 