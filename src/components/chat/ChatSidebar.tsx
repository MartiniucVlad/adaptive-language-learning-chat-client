import { useState } from 'react';
import {
  Paper, List, ListItemButton, ListItemAvatar, Avatar, ListItemText,
  Box, Typography, Stack, TextField, InputAdornment, IconButton, Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import newChatIcon from '../../assets/new_chat_icon.png';
import LogoutIcon from '@mui/icons-material/Logout';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import type {ConversationSummary} from './types';
import { stringToColor, getInitials, getConversationName } from './utils';

interface SidebarProps {
  conversations: ConversationSummary[];
  activeId: string | null;
  currentUser: string;
  onSelect: (conv: ConversationSummary) => void;
  onNewChat: () => void;
  onLogout: () => void;
}

export const ChatSidebar = ({ conversations, activeId, currentUser, onSelect, onNewChat, onLogout }: SidebarProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = conversations.filter((conv) => {
    const name = getConversationName(conv, currentUser);
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <Paper elevation={3} sx={{ width: 320, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e0e0e0', zIndex: 2 }}>
      {/* Header */}
      <Box sx={{ p: 2, bgcolor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="New Chat">
            <IconButton
              onClick={onNewChat}
              sx={{
                p: 0,
                width: 72,
                height: 72,
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
            >
              <Box
                component="img"
                src={newChatIcon}
                alt="New Chat"
                sx={{
                  // CHANGE THESE VALUES:
                  width: 54,  // increased from 24
                  height: 54, // increased from 24
                  objectFit: 'contain'
                }}
              />
            </IconButton>
          </Tooltip>
  <Typography variant="h6" fontWeight="bold" color="text.primary">Chats</Typography>
</Stack>
        <IconButton onClick={onLogout} color="error" size="small">
          <LogoutIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Search */}
      <Box sx={{ px: 2, pb: 2 }}>
        <TextField
          fullWidth size="small" placeholder="Search chats" variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          slotProps={{input : {
            startAdornment: (<InputAdornment position="start"><SearchIcon color="action" fontSize="small" /></InputAdornment>),
            sx: { borderRadius: 4, bgcolor: '#f1f1f1', '& fieldset': { border: 'none' } }
          }}}
        />
      </Box>

      {/* List */}
      <List sx={{ flex: 1, overflowY: 'auto', px: 1 }}>
        {filtered.map((conv) => {
          const displayName = getConversationName(conv, currentUser);
          const isGroup = conv.type === 'group';
          return (
            <ListItemButton
              key={conv.id}
              selected={activeId === conv.id}
              onClick={() => onSelect(conv)}
              sx={{ borderRadius: 2, mb: 0.5, '&.Mui-selected': { bgcolor: '#3390ec1a' } }}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: stringToColor(displayName) }}>
                  {isGroup ? <GroupAddIcon fontSize="small"/> : getInitials(displayName)}
                </Avatar>
              </ListItemAvatar>
                <ListItemText
                  slotProps={{
                    primary: { component: 'div' },
                    secondary: { component: 'div' }
                  }}
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography fontWeight={activeId === conv.id ? 'bold' : 'medium'} noWrap>
                        {displayName}
                      </Typography>
                      {conv.last_message_at && (
                        <Typography variant="caption" color="text.secondary">
                          {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: '80%' }}>
                        {conv.last_message_preview || "No messages"}
                      </Typography>
                      {conv.unread_count > 0 && (
                        <Box sx={{ bgcolor: '#3390ec', color: 'white', borderRadius: '50%', minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
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