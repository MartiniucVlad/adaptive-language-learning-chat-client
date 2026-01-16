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
  Chip,
  Menu,
  Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import EditIcon from '@mui/icons-material/Edit';

import { getDeckNames, getActiveDeckNotes } from './AnkiService';
import api from '../../services/axiosClient';
import { useAnki } from "./AnkiContext.tsx";

const DRAWER_WIDTH = 340;

// Language Mapping for User Friendly Display
const LANG_MAP: { [key: string]: string } = {
  en: "English",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  nl: "Dutch",
  pt: "Portuguese",
  ro: "Romanian",
  ru: "Russian",
  ja: "Japanese",
  zh: "Chinese",
  xx: "Multilingual/Other"
};

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

// --- HELPER FUNCTIONS FOR COMPATIBILITY ---

// 1. Clean HTML tags and excessive whitespace
const cleanText = (html: string) => {
  if (!html) return "";
  return html
    .replace(/<style([\s\S]*?)<\/style>/gi, '') // Remove style blocks
    .replace(/<script([\s\S]*?)<\/script>/gi, '') // Remove script blocks
    .replace(/<[^>]*>?/gm, '') // Remove tags
    .replace(/&nbsp;/g, ' ')
    .trim();
};

// 2. Smart Field Extractor
// Scans for common field names or falls back to index position
const getSmartField = (fields: any, type: 'front' | 'back') => {
  const keys = Object.keys(fields);
  if (keys.length === 0) return "Unknown";

  // Priority lists for common naming conventions
  const frontCandidates = ['Front', 'Word', 'Text', 'Question', 'Term', 'Expression', 'Kanji', 'Vocabulary', 'Romanian', 'Sentence'];
  const backCandidates = ['Back', 'Answer', 'Definition', 'Meaning', 'Translation', 'Reading', 'English', 'Notes'];

  const candidates = type === 'front' ? frontCandidates : backCandidates;

  // A. Try exact matches from our list
  for (const candidate of candidates) {
    // Case-insensitive check
    const match = keys.find(k => k.toLowerCase() === candidate.toLowerCase());
    if (match && fields[match].value) {
      return cleanText(fields[match].value);
    }
  }

  // B. Fallback: Use Index (0 for front, 1 for back)
  // If we want 'back' but only have 1 field, return empty string
  if (type === 'back' && keys.length < 2) return "";

  const fallbackIndex = type === 'front' ? 0 : 1;
  return cleanText(fields[keys[fallbackIndex]].value);
};

// ------------------------------------------

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

  // --- NEW: Language State ---
  const [deckLang, setDeckLang] = useState<string>("en");
  const [langMenuAnchor, setLangMenuAnchor] = useState<null | HTMLElement>(null);

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

  // 2. REAL-TIME UPDATES
  useEffect(() => {
    if (!lastAnkiEvent) return;

    if (lastAnkiEvent.type === 'anki_sync_state') {
      if (lastAnkiEvent.deck_name === selectedDeck) {
        setNotes(lastAnkiEvent.notes);
        // Sync language if provided in event
        if (lastAnkiEvent.language) setDeckLang(lastAnkiEvent.language);
      }
    }

    if (lastAnkiEvent.type === 'learning_update') {
      if (lastAnkiEvent.deck_name && lastAnkiEvent.deck_name !== selectedDeck) return;

      const tickedTargets = lastAnkiEvent.ticked_notes || [];

      setNotes((prevNotes) =>
        prevNotes.map((note) => {
          const isMatch = tickedTargets.some((target: any) => {
             const idMatches = String(target.id) === String(note.id);
             const wordMatches = target.word && note.front &&
                                 target.word.trim() === note.front.trim();
             return idMatches || wordMatches;
          });

          if (isMatch) return { ...note, is_reviewed: true };
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
      setDeckLang("en");
      return;
    }

    setLoading(true);
    try {
      const ankiRawNotes = await getActiveDeckNotes(deckName);

      // --- UPDATED MAPPING LOGIC START ---
      const formattedNotes = ankiRawNotes.map((n: any) => ({
        id: String(n.noteId),
        // Use the smart extractor instead of hardcoding ['Front']
        front: getSmartField(n.fields, 'front'),
        back: getSmartField(n.fields, 'back'),
        mod: n.mod,
        is_reviewed: false
      }));
      // --- UPDATED MAPPING LOGIC END ---

      const response = await api.post('/anki/active-deck-persistence', {
        deck_name: deckName,
        notes: formattedNotes
      });

      setNotes(response.data.notes);

      // --- UPDATE: Set detected language from backend ---
      if (response.data.language) {
        setDeckLang(response.data.language);
      }
    } catch (error) {
      console.error("Error syncing deck:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: Language Menu Handlers ---
  const handleLangMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setLangMenuAnchor(event.currentTarget);
  };

  const handleLangMenuClose = () => {
    setLangMenuAnchor(null);
  };

  const handleLangSelect = async (code: string) => {
    setDeckLang(code);
    handleLangMenuClose();

    try {
        await api.post('/anki/update-deck-language', {
            deck_name: selectedDeck,
            language: code
        });
    } catch (err) {
        console.error("Failed to update language preference", err);
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
          bgcolor: '#f8f9fa'
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

        {/* --- NEW: Language Detection & Override UI --- */}
        {selectedDeck && !loading && (
            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <Box sx={{ m:1,display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                        Detected Language:
                    </Typography>
                </Box>

                <Tooltip title="Click to manually change deck language">
                    <Chip
                        label={LANG_MAP[deckLang] || deckLang.toUpperCase()}
                        size="small"
                        onClick={handleLangMenuOpen}
                        icon={<EditIcon style={{ fontSize: 14 }} />}
                        sx={{
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            bgcolor: '#f0f4ff',
                            color: '#1976d2',
                            fontWeight: 'bold',
                            border: '1px solid #d1e3ff',
                            '&:hover': { bgcolor: '#d1e3ff' }
                        }}
                    />
                </Tooltip>

                <Menu
                    anchorEl={langMenuAnchor}
                    open={Boolean(langMenuAnchor)}
                    onClose={handleLangMenuClose}
                >
                    {Object.entries(LANG_MAP).map(([code, name]) => (
                        <MenuItem
                            key={code}
                            selected={code === deckLang}
                            onClick={() => handleLangSelect(code)}
                            dense
                        >
                            {name}
                        </MenuItem>
                    ))}
                </Menu>
            </Box>
        )}
        {/* ------------------------------------------- */}

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