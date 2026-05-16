// src/components/MainLayout.tsx
import {useState, useEffect} from 'react';
import {Outlet, useNavigate} from 'react-router-dom';
import {
    AppBar, Toolbar, Typography, IconButton, Tooltip, Box,
    Snackbar, Stack, Badge, Menu, MenuItem, ListItemText,
    Divider, Alert
} from '@mui/material';

import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PeopleIcon from '@mui/icons-material/People';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

import { useContext } from 'react'; // Add useContext
import { useTheme } from '@mui/material/styles'; // Add useTheme
import Brightness4Icon from '@mui/icons-material/Brightness4'; // Moon Icon
import Brightness7Icon from '@mui/icons-material/Brightness7'; // Sun Icon
import {ColorModeContext} from './ThemeContext'; // Import Context

import api, {logout} from './services/axiosClient.ts';

interface FriendRequest {
    sender: string;
    timestamp: string;
}

const MainLayout = () => {
    const navigate = useNavigate();

    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const theme = useTheme(); // Access current theme
    const colorMode = useContext(ColorModeContext);

    const isMenuOpen = Boolean(anchorEl);

    const fetchRequests = async () => {
        try {
            const res = await api.get('/friends/requests/incoming');
            setRequests(res.data);
        } catch (err) {
            console.error('Failed to fetch requests');
        }
    };

    useEffect(() => {
        fetchRequests();
        const interval = setInterval(fetchRequests, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleRequestAction = async (sender: string, action: 'accept' | 'reject') => {
        try {
            const res = await api.post(`/friends/respond/${sender}`, {action});
            setSuccessMessage(res.data.message);
            setRequests(prev => prev.filter(r => r.sender !== sender));
            if (requests.length === 1) setAnchorEl(null);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Action failed');
        }
    };

    return (
        <Box sx={{display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden'}}>
            <AppBar position="sticky" color="default" sx={{zIndex: 1201}}> {/* zIndex keeps it above drawer */}
                <Toolbar variant="dense" sx={{minHeight: 45}}> {/* Taller header feels more premium */}

                    {/* 1. Brand Logo / Name */}
                    <Typography
                        variant="h6"
                        sx={{
                            flexGrow: 1,
                            fontWeight: 800,
                            cursor: 'pointer',
                            background: 'linear-gradient(45deg, #6366f1 30%, #ec4899 90%)', // Gradient Text
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                        onClick={() => navigate('/homepage')}
                    >
                        m-chat
                    </Typography>

                    <Stack direction="row" spacing={1.5} alignItems="center">

                        <Tooltip title="Toggle Theme">
                            <IconButton
                                onClick={colorMode.toggleColorMode}
                                sx={{
                                    color: 'text.secondary',
                                    border: `1px solid ${theme.palette.divider}`
                                }}
                            >
                                {theme.palette.mode === 'dark' ? <Brightness7Icon fontSize="small"/> :
                                    <Brightness4Icon fontSize="small"/>}
                            </IconButton>
                        </Tooltip>

                        {/* 2. Modernized Icons (Slate Gray) */}
                        <Tooltip title="Friend Requests">
                            <IconButton sx={{color: 'text.secondary', border: '1px solid #e2e8f0'}}
                                        onClick={(e) => setAnchorEl(e.currentTarget)}>
                                <Badge badgeContent={requests.length} color="error"
                                       variant="dot"> {/* Dot is cleaner than number if small */}
                                    <NotificationsIcon fontSize="small"/>
                                </Badge>
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Manage Friends">
                            <IconButton sx={{color: 'text.secondary', border: '1px solid #e2e8f0'}}
                                        onClick={() => navigate('/friends')}>
                                <PeopleIcon fontSize="small"/>
                            </IconButton>
                        </Tooltip>

                        {/* Vertical Divider between Nav and Logout */}
                        <Divider orientation="vertical" flexItem sx={{height: 24, alignSelf: 'center', mx: 1}}/>

                        <Tooltip title="Logout">
                            <IconButton
                                onClick={() => {
                                    logout();
                                    navigate('/login');
                                }}
                                sx={{
                                    color: '#ef4444',
                                    bgcolor: '#fee2e2',
                                    '&:hover': {bgcolor: '#fecaca'}
                                }} // Red accent for logout
                            >
                                <LogoutIcon fontSize="small"/>
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Toolbar>
            </AppBar>

            {/* Friend Requests Menu */}
            <Menu
                anchorEl={anchorEl}
                open={isMenuOpen}
                onClose={() => setAnchorEl(null)}
                PaperProps={{sx: {width: 320}}}
            >
                <Typography variant="subtitle2" sx={{px: 2, py: 1, fontWeight: 'bold'}}>
                    Incoming Requests
                </Typography>
                <Divider/>

                {requests.length === 0 ? (
                    <MenuItem disabled>No pending requests</MenuItem>
                ) : (
                    requests.map(req => (
                        <MenuItem key={req.sender} sx={{display: 'flex', justifyContent: 'space-between'}}>
                            <ListItemText
                                primary={req.sender}
                                secondary={new Date(req.timestamp).toLocaleString()}
                            />
                            <Stack direction="row" spacing={1}>
                                <IconButton size="small" color="success"
                                            onClick={() => handleRequestAction(req.sender, 'accept')}>
                                    <CheckIcon/>
                                </IconButton>
                                <IconButton size="small" color="error"
                                            onClick={() => handleRequestAction(req.sender, 'reject')}>
                                    <CloseIcon/>
                                </IconButton>
                            </Stack>
                        </MenuItem>
                    ))
                )}
            </Menu>

            <Box component="main" sx={{flexGrow: 1, overflow: 'hidden'}}>
                <Outlet/>
            </Box>

            <Snackbar open={!!successMessage} autoHideDuration={4000}
                      onClose={() => setSuccessMessage(null)}>
                <Alert severity="success" variant="filled">{successMessage}</Alert>
            </Snackbar>

            <Snackbar open={!!error} autoHideDuration={4000}
                      onClose={() => setError(null)}>
                <Alert severity="error" variant="filled">{error}</Alert>
            </Snackbar>
        </Box>
    );
};

export default MainLayout;
