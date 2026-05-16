// src/components/LoginForm.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/axiosClient.ts'; // Import your new client
// --- MUI Imports ---
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  Container,
  CssBaseline,
  InputAdornment,
  IconButton,
  CircularProgress
} from '@mui/material';

// --- MUI Icons ---
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LoginIcon from '@mui/icons-material/Login';

const LoginForm = () => {
  const navigate = useNavigate();

  // State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Handlers
  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create Form Data format for OAuth2 standard
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      // Use the api client (or axios directly since we don't need the interceptor for login)
      const response = await api.post("/users/login", formData, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });

      const data = response.data;
      // SAVE BOTH TOKENS
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('username', username);
      navigate('/homepage');

    } catch (err: any) {
      // Axios error handling is slightly different
      const message = err.response?.data?.detail || "Login failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* --- Logo / Icon Area --- */}
        <Box
          sx={{
            m: 1,
            bgcolor: '#3390ec', // Telegram Blue
            width: 56,
            height: 56,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0px 4px 10px rgba(51, 144, 236, 0.4)'
          }}
        >
          <LockOutlinedIcon sx={{ color: 'white', fontSize: 28 }} />
        </Box>

        <Typography component="h1" variant="h5" fontWeight="700" sx={{ mt: 1, mb: 3 }}>
          Log in to Chat
        </Typography>

        {/* --- Login Card --- */}
        <Paper
            elevation={3}
            sx={{
                p: 4,
                width: '100%',
                borderRadius: 3,
                display: 'flex',
                flexDirection: 'column',
                gap: 2
            }}
        >
            {error && (
                <Alert severity="error" sx={{ width: '100%' }}>
                    {error}
                </Alert>
            )}

            <Box component="form" onSubmit={handleLogin} noValidate sx={{ mt: 1 }}>

                {/* Username Field */}
                <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="username"
                    label="Username"
                    name="username"
                    autoComplete="username"
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <PersonOutlineIcon color="action" />
                            </InputAdornment>
                        ),
                    }}
                    // Telegram-style focus color override
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            '&.Mui-focused fieldset': { borderColor: '#3390ec' },
                        },
                        '& label.Mui-focused': { color: '#3390ec' }
                    }}
                />

                {/* Password Field */}
                <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="password"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <LockOutlinedIcon color="action" />
                            </InputAdornment>
                        ),
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    aria-label="toggle password visibility"
                                    onClick={handleClickShowPassword}
                                    onMouseDown={handleMouseDownPassword}
                                    edge="end"
                                >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        )
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            '&.Mui-focused fieldset': { borderColor: '#3390ec' },
                        },
                        '& label.Mui-focused': { color: '#3390ec' }
                    }}
                />

                {/* Submit Button */}
                <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={loading}
                    startIcon={!loading && <LoginIcon />}
                    sx={{
                        mt: 4,
                        mb: 2,
                        py: 1.5,
                        borderRadius: 2,
                        bgcolor: '#3390ec',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        textTransform: 'none', // Prevents all-caps
                        boxShadow: '0 4px 12px rgba(51, 144, 236, 0.4)',
                        '&:hover': {
                            bgcolor: '#287abf'
                        }
                    }}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : "Log In"}
                </Button>
            </Box>
        </Paper>

        {/* Footer Text */}
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
    {'Don\'t have an account? '}
    <Button
        onClick={() => navigate('/register')}
        sx={{ textTransform: 'none', fontWeight: 'bold', color: '#3390ec' }}
    >
        Sign Up
    </Button>
</Typography>

      </Box>
    </Container>
  );
};

export default LoginForm;