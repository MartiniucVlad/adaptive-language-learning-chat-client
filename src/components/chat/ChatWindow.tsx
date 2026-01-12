import { Box, AppBar, Toolbar, Typography, Avatar, IconButton, Tooltip, Paper } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import SemanticSearchPng from '../../assets/semantic-search-icon.png';
import Linkify from 'linkify-react';
import type { Message, ConversationSummary } from './types';
import { stringToColor, getInitials, getConversationName } from './utils';
import MessageInput from './MessageInput';
import { AnkiReviewNote } from '../ankiNotes/AnkiReviewNote.tsx';

interface ChatWindowProps {
  activeId: string | null;
  conversation: ConversationSummary | undefined;
  messages: Message[];
  currentUser: string;
  highlightedMessageId: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;

  onSendMessage: (text: string) => void;
  onOpenSemanticSearch: () => void;
}

export const ChatWindow = ({
  activeId, conversation, messages, currentUser,
  highlightedMessageId, messagesEndRef, onSendMessage, onOpenSemanticSearch
}: ChatWindowProps) => {

  if (!activeId || !conversation) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', bgcolor: '#0e1621', flex: 1 }}>
        <Typography variant="h6" sx={{ color: '#ffffff', bgcolor: '#2b5278', px: 3, py: 1, borderRadius: 5 }}>
          Select a chat to start messaging
        </Typography>
      </Box>
    );
  }

  const activeName = getConversationName(conversation, currentUser);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <AppBar position="static" color="inherit" elevation={1} sx={{ bgcolor: '#ffffff', px: 2, py: 1 }}>
        <Toolbar disableGutters sx={{ minHeight: '56px !important' }}>
          <Avatar sx={{ bgcolor: stringToColor(activeName), width: 38, height: 38, mr: 2 }}>
            {conversation.type === 'group' ? <GroupAddIcon fontSize='small' /> : getInitials(activeName)}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">{activeName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {conversation.type === 'group' ? 'Group Chat' : 'Online'}
            </Typography>
          </Box>
          <Tooltip title="Semantic Search">
            <IconButton onClick={onOpenSemanticSearch} color="primary">
              <img
                src={SemanticSearchPng}
                alt="Semantic Search"
                style={{ width: '24px', height: '24px' }}
              />
            </IconButton>
          </Tooltip>
          <IconButton><SearchIcon /></IconButton>
          <IconButton><MoreVertIcon /></IconButton>
        </Toolbar>
      </AppBar>

      {/* Messages */}
      <Box sx={{ flex: 1, p: 2, overflowY: 'auto', bgcolor: '#8caebf', backgroundSize: 'cover' }}>
        {messages.map((msg, index) => {
          const isHighlighted = highlightedMessageId === msg.messageId;
          const msgId = `${msg.messageId}`;

          return (
            <Box
              key={index}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.isMine ? 'flex-end' : 'flex-start', // Align wrapper based on sender
                mb: msg.ankiReview ? 0 : 1 // Reduce margin if a note follows
              }}
            >
              {/* 1. The Main Chat Bubble */}
              <Box
                id={msgId}
                sx={{
                  display: 'flex',
                  justifyContent: msg.isMine ? 'flex-end' : 'flex-start',
                  width: '100%', // Take full width of wrapper to allow alignment
                  transform: isHighlighted ? 'scale(1.02)' : 'scale(1)',
                  transition: 'transform 0.3s ease-in-out',
                }}
              >
                <Paper
                  elevation={isHighlighted ? 6 : 1}
                  sx={{
                    p: 1.5,
                    maxWidth: '70%',
                    borderRadius: 3,
                    borderBottomRightRadius: msg.isMine ? 0 : 3,
                    borderBottomLeftRadius: msg.isMine ? 3 : 0,
                    bgcolor: isHighlighted ? '#fff9c4' : (msg.isMine ? '#effdde' : '#ffffff'),
                    transition: 'background-color 0.5s ease',
                    position: 'relative',
                    zIndex: 2 // Keep bubble on top of note visually
                  }}
                >
                  {conversation.type === 'group' && !msg.isMine && (
                    <Typography variant="caption" sx={{ color: stringToColor(msg.from), fontWeight: 'bold', display: 'block' }}>
                      {msg.from}
                    </Typography>
                  )}
                  <Typography variant="body1" sx={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                    <Linkify options={{ target: '_blank', className: 'chat-link' }}>{msg.content}</Linkify>
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.5, color: msg.isMine ? '#5dbb5e' : 'text.secondary', fontSize: '0.7rem' }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Paper>
              </Box>

              {/* 2. The Anki Review Note (Conditional Render) */}
              {msg.ankiReview && (
                <AnkiReviewNote
                  review={msg.ankiReview}
                  isMine={msg.isMine}
                />
              )}
            </Box>
          );
        })}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <MessageInput onSend={onSendMessage} />
    </Box>
  );
};