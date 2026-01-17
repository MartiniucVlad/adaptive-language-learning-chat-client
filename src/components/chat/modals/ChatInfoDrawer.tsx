import React, { useMemo } from 'react';
import {
    Box, Drawer, Typography, Avatar, List, ListItem, ListItemAvatar,
    ListItemText, IconButton, Button, Chip, Divider, useTheme
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import { stringToColor, getInitials, getConversationName } from '../utils';
import type { ConversationSummary } from '../types';

const DRAWER_WIDTH = 320;

interface ChatInfoDrawerProps {
    open: boolean;
    onClose: () => void;
    conversation: ConversationSummary | undefined;
    currentUser: string;
    onDeleteChat: (chatId: string) => void;
}

export const ChatInfoDrawer = ({
    open,
    onClose,
    conversation,
    currentUser,
    onDeleteChat
}: ChatInfoDrawerProps) => {
    const theme = useTheme();

    // Memoize the display name to prevent flickering
    const displayName = useMemo(() =>
        conversation ? getConversationName(conversation, currentUser) : '',
    [conversation, currentUser]);

    if (!conversation) return null;

    const isGroup = conversation.type === 'group';
    const isAdmin = conversation.admins?.includes(currentUser);

    // Sort participants: Admins first, then alphabetically
    const sortedParticipants = useMemo(() => {
        return [...conversation.participants].sort((a, b) => {
            const aIsAdmin = conversation.admins?.includes(a);
            const bIsAdmin = conversation.admins?.includes(b);
            if (aIsAdmin && !bIsAdmin) return -1;
            if (!aIsAdmin && bIsAdmin) return 1;
            return a.localeCompare(b);
        });
    }, [conversation.participants, conversation.admins]);

    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
            onDeleteChat(conversation.id);
            onClose();
        }
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            sx={{
                zIndex: 1202, // Above AppBar but below Tooltips usually
                '& .MuiDrawer-paper': {
                    width: DRAWER_WIDTH,
                    bgcolor: 'background.default'
                }
            }}
        >
            {/* Header */}
            <Box sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: 'background.paper',
                borderBottom: 1,
                borderColor: 'divider'
            }}>
                <Typography variant="h6" fontWeight={700}>
                    {isGroup ? 'Group Info' : 'Contact Info'}
                </Typography>
                <IconButton onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </Box>

            {/* Profile Hero Section */}
            <Box sx={{
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                bgcolor: 'background.paper',
                borderBottom: 1,
                borderColor: 'divider'
            }}>
                <Avatar sx={{
                    width: 100,
                    height: 100,
                    bgcolor: stringToColor(displayName),
                    fontSize: '2.5rem',
                    fontWeight: 700,
                    mb: 2,
                    boxShadow: 3
                }}>
                    {isGroup ? <GroupIcon fontSize="large" /> : getInitials(displayName)}
                </Avatar>
                <Typography variant="h5" fontWeight={700} textAlign="center" gutterBottom>
                    {displayName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {isGroup ? `${conversation.participants.length} members` : 'Private Conversation'}
                </Typography>
            </Box>

            {/* Members Section */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, ml: 1, textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700 }}>
                    {isGroup ? 'Members' : 'Participants'}
                </Typography>

                <List disablePadding sx={{ bgcolor: 'background.paper', borderRadius: 3, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
                    {sortedParticipants.map((participant) => {
                        const isPartAdmin = conversation.admins?.includes(participant);
                        const isMe = participant === currentUser;

                        return (
                            <React.Fragment key={participant}>
                                <ListItem sx={{ py: 1.5 }}>
                                    <ListItemAvatar>
                                        <Avatar sx={{ bgcolor: stringToColor(participant), width: 40, height: 40, fontSize: '0.9rem' }}>
                                            {getInitials(participant)}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="body1" fontWeight={isMe ? 700 : 500}>
                                                    {isMe ? 'You' : participant}
                                                </Typography>
                                                {isPartAdmin && isGroup && (
                                                    <Chip
                                                        label="Admin"
                                                        size="small"
                                                        icon={<AdminPanelSettingsIcon style={{ fontSize: 14 }} />}
                                                        sx={{
                                                            height: 20,
                                                            fontSize: '0.65rem',
                                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                            color: 'primary.main',
                                                            border: 'none'
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                        }
                                        secondary={isMe ? <Typography variant="caption" color="text.secondary">online</Typography> : null}
                                    />
                                </ListItem>
                                <Divider component="li" variant="inset" />
                            </React.Fragment>
                        );
                    })}
                </List>
            </Box>

            {/* Footer Actions */}
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
                {isGroup && isAdmin ? (
                    <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={handleDelete}
                        sx={{
                            justifyContent: 'flex-start',
                            borderColor: 'error.main',
                            color: 'error.main',
                            '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.05), borderColor: 'error.dark' }
                        }}
                    >
                        Delete Group
                    </Button>
                ) : (
                    // Optional: Block user button for DMs could go here
                    <Button
                        fullWidth
                        disabled
                        startIcon={<DeleteIcon />}
                        sx={{ justifyContent: 'flex-start' }}
                    >
                         {isGroup ? 'Only admins can delete' : 'Delete Chat'}
                    </Button>
                )}
            </Box>
        </Drawer>
    );
};