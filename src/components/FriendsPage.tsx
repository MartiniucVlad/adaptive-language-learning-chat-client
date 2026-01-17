import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Stack,
  InputAdornment,
  useTheme,
  Grid,
  Chip,
  Fade
} from "@mui/material";
import { alpha } from '@mui/material/styles';
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import SearchIcon from "@mui/icons-material/Search";
import GroupIcon from "@mui/icons-material/Group";
import EmojiPeopleIcon from '@mui/icons-material/EmojiPeople';
import api from "../services/axiosClient";
import { stringToColor, getInitials } from "./chat/utils"; // Reusing your existing utils

const FriendsPage = () => {
  const [friends, setFriends] = useState<string[]>([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const theme = useTheme();

  // Fetch friends
  const loadFriends = async () => {
    try {
      const res = await api.get("/friends/list");
      setFriends(res.data);
    } catch (err) {
      console.error("Failed to load friends", err);
    }
  };

  useEffect(() => {
    loadFriends();
  }, []);

  // Send friend request
  const handleAddFriend = async () => {
    if (!username.trim()) return;

    setLoading(true);
    try {
      await api.post(`/friends/request/${username}`);
      setUsername("");
      alert("Friend request sent successfully!"); // Consider replacing with Snackbar later
    } catch (err: any) {
      alert(err.response?.data?.detail || "Could not send request");
    } finally {
      setLoading(false);
    }
  };

  // Unfriend
  const handleUnfriend = async (friend: string) => {
    if (!confirm(`Are you sure you want to remove ${friend} from your friends list?`)) return;

    try {
      await api.delete(`/friends/${friend}`);
      setFriends((prev) => prev.filter((f) => f !== friend));
    } catch (err) {
      console.error("Failed to remove friend", err);
    }
  };

  // Filter friends for the search bar
  const filteredFriends = friends.filter(f =>
    f.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <Box sx={{
        height: "100%",
        bgcolor: "background.default",
        overflowY: "auto",
        p: { xs: 2, md: 4 }
    }}>
      <Grid container justifyContent="center">
        <Grid item xs={12} md={8} lg={6}>

            {/* --- HEADER SECTION --- */}
            <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Avatar
                    sx={{
                        width: 64, height: 64,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                        mx: 'auto', mb: 2
                    }}
                >
                    <GroupIcon fontSize="large" />
                </Avatar>
                <Typography variant="h4" fontWeight={800} color="text.primary" gutterBottom>
                    Friends
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Manage your connections and find new people to chat with.
                </Typography>
            </Box>

            {/* --- ADD FRIEND CARD --- */}
            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    mb: 4,
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    background: `linear-gradient(to right, ${alpha(theme.palette.primary.main, 0.02)}, transparent)`
                }}
            >
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonAddIcon color="primary" fontSize="small" />
                    Add New Friend
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                        fullWidth
                        placeholder="Enter username..."
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        variant="outlined"
                        size="medium"
                        disabled={loading}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 3,
                                bgcolor: 'background.default',
                                '& fieldset': { borderColor: 'divider' },
                                '&:hover fieldset': { borderColor: 'action.active' },
                                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                            }
                        }}
                    />
                    <Button
                        variant="contained"
                        onClick={handleAddFriend}
                        disabled={loading || !username.trim()}
                        sx={{
                            px: 4,
                            borderRadius: 3,
                            fontWeight: 700,
                            boxShadow: 'none',
                            '&:hover': { boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }
                        }}
                    >
                        Send Request
                    </Button>
                </Stack>
            </Paper>

            {/* --- SEARCH & LIST SECTION --- */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>
                    Your Friends
                    <Chip
                        label={friends.length}
                        size="small"
                        sx={{ ml: 1, bgcolor: 'action.selected', fontWeight: 700, color: 'primary.main' }}
                    />
                </Typography>

                {friends.length > 0 && (
                    <TextField
                        placeholder="Search list..."
                        size="small"
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment>,
                        }}
                        sx={{
                            width: 200,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 3,
                                bgcolor: 'background.paper'
                            }
                        }}
                    />
                )}
            </Box>

            <List disablePadding>
                {/* Empty State */}
                {friends.length === 0 && (
                     <Box sx={{
                        textAlign: 'center',
                        py: 8,
                        bgcolor: 'background.paper',
                        borderRadius: 4,
                        border: '1px dashed',
                        borderColor: 'divider'
                     }}>
                        <EmojiPeopleIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" fontWeight={600}>
                            No friends yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Use the box above to add your first connection!
                        </Typography>
                    </Box>
                )}

                {/* Filter Empty State */}
                {friends.length > 0 && filteredFriends.length === 0 && (
                     <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                         No friends found matching "{searchFilter}"
                     </Typography>
                )}

                {/* Friend Rows */}
                {filteredFriends.map((friend) => (
                    <Fade in key={friend}>
                        <Paper
                            elevation={0}
                            sx={{
                                mb: 1.5,
                                borderRadius: 3,
                                border: '1px solid',
                                borderColor: 'divider',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                    borderColor: 'primary.light'
                                }
                            }}
                        >
                            <ListItem
                                sx={{ py: 2, px: 3 }}
                                secondaryAction={
                                    <IconButton
                                        edge="end"
                                        onClick={() => handleUnfriend(friend)}
                                        sx={{
                                            color: 'text.secondary',
                                            '&:hover': {
                                                color: 'error.main',
                                                bgcolor: alpha(theme.palette.error.main, 0.1)
                                            }
                                        }}
                                        title="Remove Friend"
                                    >
                                        <PersonRemoveIcon />
                                    </IconButton>
                                }
                            >
                                <ListItemAvatar>
                                    <Avatar
                                        sx={{
                                            bgcolor: stringToColor(friend),
                                            color: '#fff',
                                            fontWeight: 700,
                                            width: 48, height: 48,
                                            mr: 1
                                        }}
                                    >
                                        {getInitials(friend)}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                                            {friend}
                                        </Typography>
                                    }
                                    secondary={
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', display: 'inline-block' }} />
                                            Connection established
                                        </Typography>
                                    }
                                />
                            </ListItem>
                        </Paper>
                    </Fade>
                ))}
            </List>

        </Grid>
      </Grid>
    </Box>
  );
};

export default FriendsPage;