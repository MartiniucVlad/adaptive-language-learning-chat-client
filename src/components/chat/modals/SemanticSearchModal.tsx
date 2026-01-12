import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  List,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Typography,
  Box,
  InputBase,
  CircularProgress,
  Paper,
  Fade
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import api from '../../../services/axiosClient';
import { SemanticResult } from '../types';
import { stringToColor, getInitials } from '../utils';

interface SemanticSearchModalProps {
  open: boolean;
  onClose: () => void;
  activeConversationId: string | null;
  onJumpToMessage: (timestamp: string) => void;
}

export const SemanticSearchModal = ({ open, onClose, activeConversationId, onJumpToMessage }: SemanticSearchModalProps) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SemanticResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim() || !activeConversationId) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const response = await api.get('/chat/search/semantic', {
        params: {
          query: query,
          conversation_id: activeConversationId
        }
      });
      setResults(response.data);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Optional: delay clearing results slightly for smoother exit animation
    setTimeout(() => {
        setQuery('');
        setResults([]);
        setHasSearched(false);
    }, 200);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      // Makes the modal float nicely with rounded corners
      PaperProps={{
        sx: {
          borderRadius: 4,
          backgroundImage: 'none',
          bgcolor: 'background.paper',
          overflow: 'hidden'
        }
      }}
    >
      {/* 1. Header Area: Clean Search Bar */}
      <Box sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.default'
      }}>
        {/* Animated Icon: changes from sparkle to spinner */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2, color: 'text.secondary' }}>
            {loading ? <CircularProgress size={24} color="inherit" /> : <SearchIcon />}
        </Box>

        <InputBase
          autoFocus
          fullWidth
          placeholder="Search for a topic or meaning..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          sx={{ fontSize: '1.1rem' }}
        />

        <IconButton size="small" onClick={handleClose} sx={{ ml: 1 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* 2. Results Area */}
      <DialogContent sx={{ p: 0, minHeight: 120, maxHeight: 450 }}>

        {/* Empty State / Hint */}
        {!hasSearched && !loading && (
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            py: 6,
            opacity: 0.6
          }}>
            <AutoAwesomeIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main', opacity: 0.5 }} />
            <Typography variant="body2" color="text.secondary">
              Type what you remember, then press Enter
            </Typography>
          </Box>
        )}

        {/* No Results State */}
        {hasSearched && !loading && results.length === 0 && (
           <Box sx={{ py: 4, textAlign: 'center' }}>
             <Typography variant="body2" color="text.secondary">
               No messages found.
             </Typography>
           </Box>
        )}

        {/* Results List */}
        <List disablePadding>
          {results.map((result, idx) => (
            <Fade in={true} timeout={300 + (idx * 50)} key={idx}>
              <ListItemButton
                onClick={() => {
                  onJumpToMessage(result.messageId); // Your original function
                }}
                alignItems="flex-start"
                sx={{
                  py: 2,
                  px: 3,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  transition: 'background-color 0.2s',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    '& .arrow-icon': { opacity: 1, transform: 'translateX(0px)' }
                  }
                }}
              >
                <ListItemAvatar sx={{ mt: 0.5 }}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      fontSize: '0.9rem',
                      bgcolor: stringToColor(result.sender)
                    }}
                  >
                    {getInitials(result.sender)}
                  </Avatar>
                </ListItemAvatar>

                <ListItemText
                  primary={
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {result.sender}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(result.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box>
                        <Typography
                            variant="body2"
                            color="text.primary"
                            sx={{
                                display: '-webkit-box',
                                overflow: 'hidden',
                                WebkitBoxOrient: 'vertical',
                                WebkitLineClamp: 2,
                                lineHeight: 1.5
                            }}
                        >
                            {result.content}
                        </Typography>

                        {/* Subtle match indicator instead of a heavy Chip */}
                        <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'primary.main', opacity: 0.8 }}>
                           {(result.score * 100).toFixed(0)}% relevant
                        </Typography>
                    </Box>
                  }
                />

                {/* Hover Reveal Icon */}
                <Box
                    className="arrow-icon"
                    sx={{
                        opacity: 0,
                        transform: 'translateX(-10px)',
                        transition: 'all 0.2s',
                        mt: 2,
                        ml: 1
                    }}
                >
                    <ArrowForwardIosIcon fontSize="small" color="disabled" sx={{ fontSize: 14 }} />
                </Box>
              </ListItemButton>
            </Fade>
          ))}
        </List>
      </DialogContent>

      {/* 3. Minimal Footer (Optional, can be removed entirely for cleaner look) */}
      {hasSearched && results.length > 0 && (
        <Box sx={{ p: 1.5, bgcolor: 'background.default', borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" align="center" display="block">
                Select a message to jump to conversation
            </Typography>
        </Box>
      )}
    </Dialog>
  );
};