import {useState} from 'react';
import {
    Paper, List, ListItemButton, ListItemAvatar, Avatar, ListItemText,
    Box, Typography, Stack, TextField, InputAdornment, IconButton, Tooltip,
    useTheme
} from '@mui/material';
import {alpha} from '@mui/material/styles'; // Import alpha for dynamic transparency
import SearchIcon from '@mui/icons-material/Search';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import EditNoteIcon from '@mui/icons-material/EditNote';
import type {ConversationSummary} from './types';
import {stringToColor, getInitials, getConversationName} from './utils';

interface SidebarProps {
    conversations: ConversationSummary[];
    activeId: string | null;
    currentUser: string;
    onSelect: (conv: ConversationSummary) => void;
    onNewChat: () => void;
    onLogout: () => void;
}

export const ChatSidebar = ({conversations, activeId, currentUser, onSelect, onNewChat, onLogout}: SidebarProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const theme = useTheme(); // Hook to access palette

    const filtered = conversations.filter((conv) => {
        const name = getConversationName(conv, currentUser);
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <Paper
            elevation={0} // Flat design
            sx={{
                width: 320,
                display: 'flex',
                flexDirection: 'column',
                borderRight: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                zIndex: 2,
                borderRadius: 0
            }}
        >
            {/* Header */}
            <Box sx={{p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Tooltip title="New Chat">
                        <IconButton
                            onClick={onNewChat}
                            sx={{
                                width: 48,
                                height: 48,
                                borderRadius: '50%', // Perfect Circle
                                // Gradient or Solid Primary Color
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                color: 'primary.contrastText', // White text (or dark based on theme)
                                boxShadow: 3,
                                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Bouncy effect
                                '&:hover': {
                                    transform: 'scale(1.1) rotate(5deg)', // Subtle pop on hover
                                    boxShadow: 6
                                }
                            }}
                        >
                            <EditNoteIcon sx={{fontSize: 26}}/>
                        </IconButton>
                    </Tooltip>
                    <Typography variant="h6" fontWeight="bold" color="text.primary">Chats</Typography>
                </Stack>
            </Box>

            {/* Search */}
            <Box sx={{px: 2, pb: 2}}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Search chats"
                    variant="outlined"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" fontSize="small"/>
                                </InputAdornment>
                            ),
                            sx: {
                                borderRadius: 4,
                                bgcolor: 'action.hover', // Adapts to Dark Mode
                                color: 'text.primary',
                                '& fieldset': {border: 'none'}
                            }
                        }
                    }}
                />
            </Box>

            {/* List */}
            <List sx={{flex: 1, overflowY: 'auto', px: 1}}>
                {filtered.map((conv) => {
                    const displayName = getConversationName(conv, currentUser);
                    const isGroup = conv.type === 'group';
                    const isActive = activeId === conv.id;

                    return (
                        <ListItemButton
                            key={conv.id}
                            selected={isActive}
                            onClick={() => onSelect(conv)}
                            sx={{
                                mx: 1.5,
                                my: 0.5,
                                p: 1.5,
                                borderRadius: 3,
                                transition: 'all 0.2s ease',
                                // Dynamic Border
                                border: '1px solid',
                                borderColor: isActive ? alpha(theme.palette.primary.main, 0.3) : 'transparent',

                                // Dynamic Background using Alpha
                                bgcolor: isActive
                                    ? alpha(theme.palette.primary.main, 0.12) + ' !important'
                                    : 'transparent',

                                '&:hover': {bgcolor: 'action.hover'}
                            }}
                        >
                            <ListItemAvatar>
                                <Avatar sx={{
                                    bgcolor: stringToColor(displayName),
                                    color: '#fff', // Ensure initial text is white
                                    width: 44, height: 44,
                                    fontSize: '1rem',
                                    fontWeight: 600
                                }}>
                                    {isGroup ? <GroupAddIcon fontSize="small"/> : getInitials(displayName)}
                                </Avatar>
                            </ListItemAvatar>

                            <ListItemText
                                primary={
                                    <Box sx={{display: 'flex', justifyContent: 'space-between', mb: 0.5}}>
                                        <Typography
                                            variant="subtitle2"
                                            sx={{
                                                fontWeight: isActive ? 700 : 600,
                                                color: isActive ? 'primary.main' : 'text.primary'
                                            }}
                                        >
                                            {displayName}
                                        </Typography>

                                        {conv.last_message_at && (
                                            <Typography variant="caption" color="text.secondary"
                                                        sx={{fontSize: '0.7rem'}}>
                                                {new Date(conv.last_message_at).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </Typography>
                                        )}
                                    </Box>
                                }
                                secondary={
                                    <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            noWrap
                                            sx={{maxWidth: '80%'}}
                                        >
                                            {conv.last_message_preview || "No messages"}
                                        </Typography>

                                        {conv.unread_count > 0 && (
                                            <Box sx={{
                                                bgcolor: 'primary.main',
                                                color: 'primary.contrastText',
                                                borderRadius: '50%',
                                                minWidth: 20,
                                                height: 20,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold'
                                            }}>
                                                {conv.unread_count}
                                            </Box>
                                        )}
                                    </Box>
                                }
                            />
                        </ListItemButton>
                    );
                })}
            </List>
        </Paper>
    );
};