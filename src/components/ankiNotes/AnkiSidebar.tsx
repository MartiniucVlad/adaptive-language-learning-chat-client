import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Drawer,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Divider,
  CircularProgress,
  LinearProgress,
  Paper,
  Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

import { getDeckNames, getActiveDeckNotes } from './AnkiService';
import api from '../../services/axiosClient';
import { useAnki } from "./AnkiContext.tsx";

const DRAWER_WIDTH = 340; // Slightly wider for better breathing room

interface AnkiNote {
  id: string;
  front: string;
  back: string;
  mod: number;
  is_reviewed: boolean;
}

interface AnkiSidebarProps {
  open: boolean;
  onClose: () => void;
  currentUser: string;
  lastAnkiEvent?: any;
}

export const AnkiSidebar: React.FC<AnkiSidebarProps> = ({
  open,
  onClose,
  currentUser,
  lastAnkiEvent
}) => {
  const { selectedDeck, setSelectedDeck } = useAnki();
  const [decks, setDecks] = useState<string[]>([]);
  const [notes, setNotes] = useState<AnkiNote[]>([]);
  const [loading, setLoading] = useState(false);

  // Statistics Calculation
  const stats = useMemo(() => {
    const total = notes.length;
    const reviewed = notes.filter(n => n.is_reviewed).length;
    const progress = total === 0 ? 0 : (reviewed / total) * 100;
    return { total, reviewed, progress };
  }, [notes]);

  // 1. Load Deck List
  useEffect(() => {
    if (open) loadDecks();
  }, [open]);

  // 2. REAL-TIME UPDATES (BUG FIXED HERE)
  useEffect(() => {
    if (!lastAnkiEvent) return;

    if (lastAnkiEvent.type === 'anki_sync_state') {
      if (lastAnkiEvent.deck_name === selectedDeck) {
        setNotes(lastAnkiEvent.notes);
      }
    }

    if (lastAnkiEvent.type === 'learning_update') {
      if (lastAnkiEvent.deck_name && lastAnkiEvent.deck_name !== selectedDeck) return;

      // FIX: The event sends an array of objects: [{id: "...", word: "..."}]
      const tickedTargets = lastAnkiEvent.ticked_notes || [];

      setNotes((prevNotes) =>
        prevNotes.map((note) => {
          // Check if this note matches ANY item in the tickedTargets array
          const isMatch = tickedTargets.some((target: any) => {
             // 1. Check ID Match
             const idMatches = String(target.id) === String(note.id);

             // 2. Check Word Match (Trim strings to handle "über " vs "über")
             const wordMatches = target.word && note.front &&
                                 target.word.trim() === note.front.trim();

             return idMatches || wordMatches;
          });

          if (isMatch) {
            return { ...note, is_reviewed: true };
          }
          return note;
        })
      );
    }
  }, [lastAnkiEvent, selectedDeck]);

  const loadDecks = async () => {
    const deckList = await getDeckNames();
    setDecks(deckList);
  };

  const handleDeckChange = async (event: any) => {
    const deckName = event.target.value;
    setSelectedDeck(deckName);

    if (!deckName) {
      setNotes([]);
      return;
    }

    setLoading(true);
    try {
      const ankiRawNotes = await getActiveDeckNotes(deckName);

      const formattedNotes = ankiRawNotes.map((n: any) => ({
        id: String(n.noteId),
        front: n.fields['Front']?.value.replace(/<[^>]*>?/gm, '') || "Unknown",
        back: n.fields['Back']?.value.replace(/<[^>]*>?/gm, '') || "",
        mod: n.mod,
        is_reviewed: false
      }));

      const response = await api.post('/anki/active-deck-persistence', {
        deck_name: deckName,
        notes: formattedNotes
      });

      setNotes(response.data.notes);
    } catch (error) {
      console.error("Error syncing deck:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      variant="persistent"
      sx={{
        width: open ? DRAWER_WIDTH : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          top: 64,
          height: 'calc(100% - 64px)',
          bgcolor: '#f8f9fa' // Light grey background for professional feel
        },
      }}
    >
      {/* Header Area */}
      <Box sx={{ p: 2, bgcolor: '#fff', borderBottom: '1px solid #e0e0e0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            Learning Session
          </Typography>
          <Box>
            <IconButton onClick={() => handleDeckChange({ target: { value: selectedDeck } })} disabled={loading || !selectedDeck}>
              <RefreshIcon />
            </IconButton>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <FormControl fullWidth size="small">
          <InputLabel>Active Deck</InputLabel>
          <Select value={selectedDeck} label="Active Deck" onChange={handleDeckChange}>
            <MenuItem value=""><em>None</em></MenuItem>
            {decks.map((deck) => (
              <MenuItem key={deck} value={deck}>{deck}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Progress Bar Statistics */}
        {selectedDeck && !loading && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" fontWeight="bold" color="text.secondary">
                MASTERY PROGRESS
              </Typography>
              <Typography variant="caption" fontWeight="bold" color="primary">
                {stats.reviewed} / {stats.total}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={stats.progress}
              sx={{ height: 8, borderRadius: 4, bgcolor: '#e0e0e0', '& .MuiLinearProgress-bar': { borderRadius: 4 } }}
            />
          </Box>
        )}
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={30} />
          </Box>
        ) : !selectedDeck ? (
          <Box sx={{ textAlign: 'center', opacity: 0.5, mt: 4 }}>
            <Typography variant="body2">Please select a deck to start.</Typography>
          </Box>
        ) : notes.length === 0 ? (
          <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mt: 4 }}>
              No cards due! You're all caught up.
          </Typography>
        ) : (
          <List disablePadding>
            {notes.map((note) => (
              <Paper
                key={note.id}
                elevation={0}
                sx={{
                  mb: 1.5,
                  borderRadius: 2,
                  border: note.is_reviewed ? '1px solid #e0e0e0' : '1px solid #d1e3ff',
                  bgcolor: note.is_reviewed ? '#f5f5f5' : '#ffffff',
                  transition: 'all 0.3s ease',
                  opacity: note.is_reviewed ? 0.7 : 1
                }}
              >
                <ListItem sx={{ py: 1.5 }}>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body1"
                        fontWeight={note.is_reviewed ? 'normal' : 'bold'}
                        sx={{
                          textDecoration: note.is_reviewed ? 'line-through' : 'none',
                          color: note.is_reviewed ? 'text.secondary' : 'text.primary'
                        }}
                      >
                        {note.front}
                      </Typography>
                    }
                  />

                  {/* Automated Status Indicator */}
                  <ListItemIcon sx={{ minWidth: 'auto' }}>
                    {note.is_reviewed ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <RadioButtonUncheckedIcon color="disabled" />
                    )}
                  </ListItemIcon>
                </ListItem>
              </Paper>
            ))}
          </List>
        )}
      </Box>
    </Drawer>
  );
};