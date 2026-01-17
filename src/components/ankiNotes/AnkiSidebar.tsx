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
  CircularProgress,
  LinearProgress,
  Paper,
  Chip,
  Menu,
  Tooltip,
  useTheme,
  Button,
  Link
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import EditIcon from '@mui/icons-material/Edit';
import CloudOffIcon from '@mui/icons-material/CloudOff'; // Icon for error
import ExtensionIcon from '@mui/icons-material/Extension'; // Icon for instructions

import { getDeckNames, getActiveDeckNotes } from './AnkiService';
import api from '../../services/axiosClient';
import { useAnki } from "./AnkiContext.tsx";

const DRAWER_WIDTH = 340;

const LANG_MAP: { [key: string]: string } = {
  en: "English", de: "German", fr: "French", es: "Spanish", it: "Italian",
  nl: "Dutch", pt: "Portuguese", ro: "Romanian", ru: "Russian",
  ja: "Japanese", zh: "Chinese", xx: "Multilingual/Other"
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

// ... Helper Functions (cleanText / getSmartField) remain the same ...
const cleanText = (html: string) => {
  if (!html) return "";
  return html.replace(/<style([\s\S]*?)<\/style>/gi, '')
    .replace(/<script([\s\S]*?)<\/script>/gi, '')
    .replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
};

const getSmartField = (fields: any, type: 'front' | 'back') => {
  const keys = Object.keys(fields);
  if (keys.length === 0) return "Unknown";
  const frontCandidates = ['Front', 'Word', 'Text', 'Question', 'Term', 'Expression', 'Kanji', 'Vocabulary', 'Romanian', 'Sentence'];
  const backCandidates = ['Back', 'Answer', 'Definition', 'Meaning', 'Translation', 'Reading', 'English', 'Notes'];
  const candidates = type === 'front' ? frontCandidates : backCandidates;
  for (const candidate of candidates) {
    const match = keys.find(k => k.toLowerCase() === candidate.toLowerCase());
    if (match && fields[match].value) return cleanText(fields[match].value);
  }
  if (type === 'back' && keys.length < 2) return "";
  const fallbackIndex = type === 'front' ? 0 : 1;
  return cleanText(fields[keys[fallbackIndex]].value);
};

export const AnkiSidebar: React.FC<AnkiSidebarProps> = ({
  open, onClose, currentUser, lastAnkiEvent
}) => {
  const { selectedDeck, setSelectedDeck } = useAnki();
  const [decks, setDecks] = useState<string[]>([]);
  const [notes, setNotes] = useState<AnkiNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false); // <--- State for Error
  const [deckLang, setDeckLang] = useState<string>("en");
  const [langMenuAnchor, setLangMenuAnchor] = useState<null | HTMLElement>(null);

  const theme = useTheme();

  const stats = useMemo(() => {
    const total = notes.length;
    const reviewed = notes.filter(n => n.is_reviewed).length;
    const progress = total === 0 ? 0 : (reviewed / total) * 100;
    return { total, reviewed, progress };
  }, [notes]);

  useEffect(() => {
    if (open) loadDecks();
  }, [open]);

  useEffect(() => {
    if (!lastAnkiEvent) return;
    if (lastAnkiEvent.type === 'anki_sync_state') {
      if (lastAnkiEvent.deck_name === selectedDeck) {
        setNotes(lastAnkiEvent.notes);
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
             const wordMatches = target.word && note.front && target.word.trim() === note.front.trim();
             return idMatches || wordMatches;
          });
          if (isMatch) return { ...note, is_reviewed: true };
          return note;
        })
      );
    }
  }, [lastAnkiEvent, selectedDeck]);

  const loadDecks = async () => {
    setLoading(true);
    setConnectionError(false);
    try {
      // Because we updated ankiService.ts to throw errors,
      // this catch block will now accurately catch Network Errors.
      const deckList = await getDeckNames();
      setDecks(deckList || []);
    } catch (error) {
      console.error("Caught error in UI:", error);
      setConnectionError(true);
      setDecks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeckChange = async (event: any) => {
    const deckName = event.target.value;
    setSelectedDeck(deckName);
    if (!deckName) { setNotes([]); setDeckLang("en"); return; }

    setLoading(true);
    setConnectionError(false);
    try {
      const ankiRawNotes = await getActiveDeckNotes(deckName);
      const formattedNotes = ankiRawNotes.map((n: any) => ({
        id: String(n.noteId),
        front: getSmartField(n.fields, 'front'),
        back: getSmartField(n.fields, 'back'),
        mod: n.mod,
        is_reviewed: false
      }));
      const response = await api.post('/anki/active-deck-persistence', { deck_name: deckName, notes: formattedNotes });
      setNotes(response.data.notes);
      if (response.data.language) setDeckLang(response.data.language);
    } catch (error) {
      console.error("Error syncing deck:", error);
      setConnectionError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLangMenuOpen = (event: React.MouseEvent<HTMLElement>) => setLangMenuAnchor(event.currentTarget);
  const handleLangMenuClose = () => setLangMenuAnchor(null);
  const handleLangSelect = async (code: string) => {
    setDeckLang(code); handleLangMenuClose();
    try { await api.post('/anki/update-deck-language', { deck_name: selectedDeck, language: code }); }
    catch (err) { console.error("Failed", err); }
  };

  // --- ELEGANT ERROR COMPONENT ---
  const renderErrorState = () => (
    <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
        textAlign: 'center'
    }}>
        {/* Soft Circular Background for Icon  */}
        <Box sx={{
            width: 80, height: 80,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.error.main, 0.1),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mb: 2
        }}>
            <CloudOffIcon sx={{ fontSize: 40, color: 'error.main' }} />
        </Box>

        <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: 'text.primary' }}>
            Connection Failed
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 280, lineHeight: 1.5 }}>
            We couldn't connect to your local Anki instance. Make sure Anki is running in the background.
        </Typography>

        <Button
            variant="contained"
            onClick={loadDecks}
            startIcon={<RefreshIcon />}
            disableElevation
            sx={{
                mb: 4,
                bgcolor: theme.palette.mode === 'light' ? 'error.main' : 'error.dark',
                '&:hover': { bgcolor: theme.palette.error.dark },
                borderRadius: 3,
                px: 3
            }}
        >
            Retry Connection
        </Button>

        {/* Helpful Instructions Card */}
        <Paper
            variant="outlined"
            sx={{
                p: 2.5,
                textAlign: 'left',
                width: '100%',
                borderRadius: 3,
                bgcolor: 'background.paper',
                border: `1px solid ${theme.palette.divider}`
            }}
        >
            <Typography variant="subtitle2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, color: 'text.primary' }}>
                <ExtensionIcon fontSize="small" sx={{ color: theme.palette.primary.main }} />
                Troubleshooting
            </Typography>
            <List dense disablePadding>
                <ListItem disableGutters sx={{ py: 0.5 }}>
                    <ListItemText
                        primary="1. Open the Anki Desktop App."
                        primaryTypographyProps={{ fontSize: '0.85rem', color: 'text.secondary' }}
                    />
                </ListItem>
                <ListItem disableGutters sx={{ py: 0.5 }}>
                    <ListItemText
                        primary={
                            <span>
                                2. Ensure <Link href="https://ankiweb.net/shared/info/2055492159" target="_blank" rel="noopener" underline="hover" sx={{ fontWeight: 600, color: 'primary.main' }}>AnkiConnect</Link> (2055492159) is installed.
                            </span>
                        }
                        primaryTypographyProps={{ fontSize: '0.85rem', color: 'text.secondary' }}
                    />
                </ListItem>
                <ListItem disableGutters sx={{ py: 0.5 }}>
                    <ListItemText
                        primary="3. Restart Anki and click Retry above."
                        primaryTypographyProps={{ fontSize: '0.85rem', color: 'text.secondary' }}
                    />
                </ListItem>
            </List>
        </Paper>
    </Box>
  );

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
          bgcolor: 'background.default',
          borderLeft: 1,
          borderColor: 'divider'
        },
      }}
    >
      {/* Header Area */}
      <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}>
            Learning Session
          </Typography>
          <Box>
            <IconButton onClick={loadDecks} disabled={loading}>
              <RefreshIcon />
            </IconButton>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Hide Inputs if error */}
        {!connectionError && (
            <FormControl fullWidth size="small" disabled={loading}>
                <InputLabel>Active Deck</InputLabel>
                <Select value={selectedDeck} label="Active Deck" onChange={handleDeckChange}>
                    <MenuItem value=""><em>None</em></MenuItem>
                    {decks.map((deck) => (
                    <MenuItem key={deck} value={deck}>{deck}</MenuItem>
                    ))}
                </Select>
            </FormControl>
        )}

        {/* Stats & Tools (Only show if OK) */}
        {!connectionError && selectedDeck && !loading && (
            <>
                 <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <Tooltip title="Click to manually change deck language">
                        <Chip
                            label={LANG_MAP[deckLang] || deckLang.toUpperCase()}
                            size="small"
                            onClick={handleLangMenuOpen}
                            icon={<EditIcon style={{ fontSize: 14, color: theme.palette.primary.main }} />}
                            sx={{
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: 'primary.main',
                                fontWeight: 'bold',
                                border: '1px solid',
                                borderColor: alpha(theme.palette.primary.main, 0.2),
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                            }}
                        />
                    </Tooltip>
                    <Menu anchorEl={langMenuAnchor} open={Boolean(langMenuAnchor)} onClose={handleLangMenuClose}>
                        {Object.entries(LANG_MAP).map(([code, name]) => (
                            <MenuItem key={code} selected={code === deckLang} onClick={() => handleLangSelect(code)} dense>
                                {name}
                            </MenuItem>
                        ))}
                    </Menu>
                </Box>

                <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" fontWeight="bold" color="text.secondary">MASTERY PROGRESS</Typography>
                    <Typography variant="caption" fontWeight="bold" color="primary">{stats.reviewed} / {stats.total}</Typography>
                    </Box>
                    <LinearProgress
                    variant="determinate"
                    value={stats.progress}
                    sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 4 } }}
                    />
                </Box>
            </>
        )}
      </Box>

      {/* Main Content Area: Show Error OR Content */}
      {connectionError ? (
          renderErrorState()
      ) : (
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress size={30} />
              </Box>
            ) : !selectedDeck ? (
              <Box sx={{ textAlign: 'center', opacity: 0.5, mt: 4 }}>
                <Typography variant="body2" color="text.secondary">Please select a deck to start.</Typography>
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
                      border: '1px solid',
                      borderColor: note.is_reviewed ? 'divider' : alpha(theme.palette.primary.main, 0.3),
                      bgcolor: note.is_reviewed ? 'action.hover' : 'background.paper',
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
                      <ListItemIcon sx={{ minWidth: 'auto' }}>
                        {note.is_reviewed ? (
                          <CheckCircleIcon color="success" />
                        ) : (
                          <RadioButtonUncheckedIcon sx={{ color: 'action.disabled' }} />
                        )}
                      </ListItemIcon>
                    </ListItem>
                  </Paper>
                ))}
              </List>
            )}
          </Box>
      )}
    </Drawer>
  );
};