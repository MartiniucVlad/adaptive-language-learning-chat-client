// src/components/srs/SrsSidebar.tsx

import React, {useState, useEffect} from 'react';
import {
    Box, Typography, Select, MenuItem, FormControl, InputLabel,
    List, ListItem, ListItemText, ListItemIcon, IconButton, CircularProgress,
    LinearProgress, Paper, Chip, Tooltip, Button, TextField, Snackbar, Alert,
    useTheme, Divider, Stack,
} from '@mui/material';
import {alpha} from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ScheduleIcon from '@mui/icons-material/Schedule';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';

import {useSrs} from './SrsContext';
import {
    srsApi, formatPos, formatDueRelative, formatState,
    isOverdue, type DeckStatsResponse, type CardResponse,
} from './SrsService.tsx';

// ── Props ─────────────────────────────────────────────────────────────────────

interface SrsSidebarProps {
    onClose: () => void;
    currentUser: string;
    onStartReview: (deckId: string) => void;
}

// ── Stat chip ────────────────────────────────────────────────────────────────

const StatChip: React.FC<{
    label: string; value: number; color: string; icon: React.ReactNode;
}> = ({label, value, color, icon}) => (
    <Paper variant="outlined" sx={{
        flex: 1, p: 0.8, textAlign: 'center', borderRadius: 1.5,
        bgcolor: alpha(color, 0.06), borderColor: alpha(color, 0.15),
    }}>
        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.3, mb: 0.1}}>
            <Box sx={{fontSize: 11, color}}>{icon}</Box>
            <Typography variant="h6" fontWeight={800} sx={{color, lineHeight: 1, fontSize: '1.1rem'}}>
                {value}
            </Typography>
        </Box>
        <Typography variant="caption" sx={{
            color: 'text.secondary', fontWeight: 600, letterSpacing: 0.5, fontSize: '0.58rem',
        }}>
            {label.toUpperCase()}
        </Typography>
    </Paper>
);

const STATE_COLORS: Record<number, string> = {1: '#1976d2', 2: '#388e3c', 3: '#ed6c02'};

// ── Component ────────────────────────────────────────────────────────────────

export const SrsSidebar: React.FC<SrsSidebarProps> = ({
    onClose, currentUser, onStartReview,
}) => {
    const theme = useTheme();
    const {
        decks, selectedDeckId, setSelectedDeckId, isReviewing,
        loading, refetchDecks, selectedDeck,
    } = useSrs();

    const [deckStats, setDeckStats] = useState<DeckStatsResponse | null>(null);
    const [duePreview, setDuePreview] = useState<CardResponse[]>([]);
    const [statsLoading, setStatsLoading] = useState(false);
    const [showCreateInput, setShowCreateInput] = useState(false);
    const [newDeckName, setNewDeckName] = useState('');
    const [creating, setCreating] = useState(false);
    const [optimizing, setOptimizing] = useState(false);
    const [optMessage, setOptMessage] = useState<{
        text: string; severity: 'success' | 'info' | 'warning';
    } | null>(null);

    useEffect(() => {
        if (!selectedDeckId) { setDeckStats(null); setDuePreview([]); return; }
        (async () => {
            setStatsLoading(true);
            try {
                const [stats, session] = await Promise.all([
                    srsApi.getDeckStats(selectedDeckId),
                    srsApi.getReviewSession(selectedDeckId, 5),
                ]);
                setDeckStats(stats);
                setDuePreview(session.cards);
            } catch (err) {
                console.error('Failed to load deck details:', err);
            } finally {
                setStatsLoading(false);
            }
        })();
    }, [selectedDeckId]);

    const handleRefresh = async () => {
        await refetchDecks();
        if (selectedDeckId) {
            const id = selectedDeckId;
            setSelectedDeckId(null);
            setTimeout(() => setSelectedDeckId(id), 0);
        }
    };

    const handleCreateDeck = async () => {
        const name = newDeckName.trim();
        if (!name) return;
        setCreating(true);
        try {
            const deck = await srsApi.createDeck({name, language: 'de'});
            await refetchDecks();
            setSelectedDeckId(deck.deck_id);
            setNewDeckName('');
            setShowCreateInput(false);
        } catch (err) {
            console.error('Failed to create deck:', err);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteDeck = async (deckId: string, deckName: string) => {
        if (!window.confirm(`Delete "${deckName}" and all its cards?`)) return;
        try {
            await srsApi.deleteDeck(deckId);
            if (selectedDeckId === deckId) setSelectedDeckId(null);
            await refetchDecks();
        } catch (err) {
            console.error('Failed to delete deck:', err);
        }
    };

    const handleOptimize = async () => {
        setOptimizing(true);
        try {
            const result = await srsApi.optimizeScheduler();
            setOptMessage({text: result.message, severity: result.status === 'started' ? 'info' : 'warning'});
        } catch {
            setOptMessage({text: 'Optimisation failed.', severity: 'warning'});
        } finally {
            setOptimizing(false);
        }
    };

    const dueCount = selectedDeck?.due_count ?? 0;

    return (
        <>
            <Box sx={{display: 'flex', flexDirection: 'column', height: '100%'}}>

                {/* ── Header ──────────────────────────────────────────────────── */}
                <Box sx={{
                    p: 1.5, bgcolor: 'background.paper',
                    borderBottom: 1, borderColor: 'divider',
                }}>
                    <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1}}>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{
                            display: 'flex', alignItems: 'center', gap: 0.5,
                        }}>
                            <LibraryBooksIcon fontSize="small" color="primary"/>
                            Flashcards
                        </Typography>
                        <Box>
                            <IconButton onClick={handleRefresh} disabled={loading} size="small">
                                <RefreshIcon fontSize="small"/>
                            </IconButton>
                            <IconButton onClick={onClose} size="small">
                                <CloseIcon fontSize="small"/>
                            </IconButton>
                        </Box>
                    </Box>

                    <FormControl fullWidth size="small" disabled={loading || isReviewing}>
                        <InputLabel>Deck</InputLabel>
                        <Select value={selectedDeckId ?? ''} label="Deck"
                                onChange={e => setSelectedDeckId(e.target.value || null)}>
                            <MenuItem value=""><em>None</em></MenuItem>
                            {decks.map(d => (
                                <MenuItem key={d.deck_id} value={d.deck_id}>
                                    <Box sx={{
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: 'space-between', width: '100%', pr: 1,
                                    }}>
                                        <span style={{fontSize: '0.85rem'}}>{d.name}</span>
                                        {d.due_count > 0 && (
                                            <Chip label={d.due_count} size="small" sx={{
                                                height: 18, minWidth: 22, fontSize: '0.65rem',
                                                bgcolor: alpha(theme.palette.error.main, 0.12),
                                                color: 'error.main', fontWeight: 700,
                                            }}/>
                                        )}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                {/* ── Body ────────────────────────────────────────────────────── */}
                <Box sx={{flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column'}}>
                    {loading ? (
                        <Box sx={{display: 'flex', justifyContent: 'center', p: 4}}>
                            <CircularProgress size={24}/>
                        </Box>
                    ) : !selectedDeckId ? (
                        /* ── Deck list ────────────────────────────────────────── */
                        <Box sx={{p: 1.5}}>
                            {showCreateInput ? (
                                <Box sx={{display: 'flex', gap: 0.5, mb: 1.5}}>
                                    <TextField size="small" fullWidth placeholder="Deck name…"
                                               value={newDeckName}
                                               onChange={e => setNewDeckName(e.target.value)}
                                               onKeyDown={e => {
                                                   if (e.key === 'Enter') handleCreateDeck();
                                                   if (e.key === 'Escape') { setShowCreateInput(false); setNewDeckName(''); }
                                               }}
                                               autoFocus/>
                                    <IconButton onClick={handleCreateDeck}
                                                disabled={creating || !newDeckName.trim()} size="small" color="primary">
                                        <CheckCircleOutlineIcon fontSize="small"/>
                                    </IconButton>
                                    <IconButton onClick={() => { setShowCreateInput(false); setNewDeckName(''); }}
                                                size="small">
                                        <CloseIcon fontSize="small"/>
                                    </IconButton>
                                </Box>
                            ) : (
                                <Button fullWidth startIcon={<AddIcon/>}
                                        onClick={() => setShowCreateInput(true)} size="small"
                                        sx={{mb: 1.5, borderRadius: 2}}>
                                    New Deck
                                </Button>
                            )}

                            {decks.length === 0 ? (
                                <Typography variant="body2" sx={{
                                    textAlign: 'center', color: 'text.secondary', mt: 4,
                                }}>
                                    No decks yet.
                                </Typography>
                            ) : (
                                <List disablePadding>
                                    {decks.map(d => (
                                        <Paper key={d.deck_id} variant="outlined" sx={{
                                            mb: 0.8, borderRadius: 1.5, cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            '&:hover': {
                                                borderColor: 'primary.main',
                                                bgcolor: alpha(theme.palette.primary.main, 0.04),
                                            },
                                        }} onClick={() => setSelectedDeckId(d.deck_id)}>
                                            <ListItem sx={{py: 0.8}}>
                                                <ListItemText
                                                    primary={
                                                        <Box sx={{
                                                            display: 'flex', alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                        }}>
                                                            <Typography variant="body2"
                                                                        fontWeight={600}>{d.name}</Typography>
                                                            {d.due_count > 0 && (
                                                                <Chip label={`${d.due_count} due`}
                                                                      size="small" color="error"
                                                                      sx={{height: 18, fontSize: '0.65rem', fontWeight: 700}}/>
                                                            )}
                                                        </Box>
                                                    }
                                                    secondary={`${d.card_count} cards · ${d.new_count} new`}
                                                    secondaryTypographyProps={{variant: 'caption'}}
                                                />
                                                <ListItemIcon sx={{minWidth: 'auto'}}>
                                                    <Tooltip title="Delete deck">
                                                        <IconButton size="small"
                                                                    onClick={e => {
                                                                        e.stopPropagation();
                                                                        handleDeleteDeck(d.deck_id, d.name);
                                                                    }}
                                                                    sx={{
                                                                        opacity: 0.3,
                                                                        '&:hover': {opacity: 1, color: 'error.main'},
                                                                    }}>
                                                            <DeleteOutlineIcon fontSize="small"/>
                                                        </IconButton>
                                                    </Tooltip>
                                                </ListItemIcon>
                                            </ListItem>
                                        </Paper>
                                    ))}
                                </List>
                            )}
                        </Box>
                    ) : deckStats ? (
                        /* ── Deck detail ─────────────────────────────────────── */
                        <Box sx={{p: 1.5}}>
                            <Stack direction="row" spacing={0.8} sx={{mb: 1.5}}>
                                <StatChip label="Total" value={deckStats.total_cards} color="#78909c"
                                          icon={<LibraryBooksIcon sx={{fontSize: 12}}/>}/>
                                <StatChip label="Due" value={deckStats.due_now}
                                          color={theme.palette.error.main}
                                          icon={<ScheduleIcon sx={{fontSize: 12}}/>}/>
                                <StatChip label="New" value={deckStats.new_cards} color="#1976d2"
                                          icon={<NewReleasesIcon sx={{fontSize: 12}}/>}/>
                            </Stack>

                            {deckStats.total_reviews > 0 && (
                                <Box sx={{mb: 1.5}}>
                                    <Box sx={{display: 'flex', justifyContent: 'space-between', mb: 0.3}}>
                                        <Typography variant="caption" fontWeight={600}
                                                    color="text.secondary">MATURE</Typography>
                                        <Typography variant="caption" fontWeight={700}
                                                    color="text.secondary">
                                            {deckStats.mature_cards}/{deckStats.total_cards}
                                        </Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={deckStats.total_cards > 0
                                            ? (deckStats.mature_cards / deckStats.total_cards) * 100 : 0}
                                        sx={{
                                            height: 5, borderRadius: 3, bgcolor: 'action.hover',
                                            '& .MuiLinearProgress-bar': {
                                                borderRadius: 3, bgcolor: theme.palette.success.main,
                                            },
                                        }}
                                    />
                                    <Typography variant="caption" color="text.secondary" sx={{
                                        mt: 0.2, display: 'block', fontSize: '0.62rem',
                                    }}>
                                        {deckStats.total_reviews} reviews · avg diff {deckStats.average_difficulty}
                                    </Typography>
                                </Box>
                            )}

                            <Button fullWidth variant="contained" size="medium"
                                    startIcon={<PlayArrowIcon/>}
                                    onClick={() => selectedDeckId && onStartReview(selectedDeckId)}
                                    disabled={dueCount === 0 || isReviewing}
                                    sx={{
                                        mb: 1.5, py: 1, borderRadius: 2, fontWeight: 700,
                                        fontSize: '0.85rem',
                                        ...(dueCount > 0 && !isReviewing ? {
                                            bgcolor: theme.palette.mode === 'light' ? '#1b5e20' : '#2e7d32',
                                            '&:hover': {
                                                bgcolor: theme.palette.mode === 'light' ? '#2e7d32' : '#388e3c',
                                            },
                                        } : {}),
                                    }}
                            >
                                {isReviewing ? 'In Progress…'
                                    : dueCount > 0 ? `Review (${dueCount})`
                                        : 'All Caught Up!'}
                            </Button>

                            {/* Due preview */}
                            {duePreview.length > 0 && (
                                <>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary"
                                                sx={{mb: 0.5, display: 'block', letterSpacing: 0.5, fontSize: '0.62rem'}}>
                                        UPCOMING
                                    </Typography>
                                    <List disablePadding sx={{mb: 1.5}}>
                                        {duePreview.map(card => (
                                            <Paper key={card.card_id} variant="outlined" sx={{
                                                mb: 0.5, borderRadius: 1,
                                                bgcolor: isOverdue(card.due)
                                                    ? alpha(theme.palette.error.main, 0.04)
                                                    : 'background.paper',
                                                borderColor: isOverdue(card.due)
                                                    ? alpha(theme.palette.error.main, 0.2)
                                                    : 'divider',
                                            }}>
                                                <ListItem sx={{py: 0.5, px: 1}}>
                                                    <ListItemText
                                                        primary={
                                                            <Typography variant="body2"
                                                                        fontWeight={600}>{card.front.word}</Typography>
                                                        }
                                                        secondary={
                                                            <Box sx={{
                                                                display: 'flex', alignItems: 'center',
                                                                gap: 0.5, mt: 0.2,
                                                            }}>
                                                                {card.front.part_of_speech && (
                                                                    <Chip label={formatPos(card.front.part_of_speech)}
                                                                          size="small" sx={{
                                                                        height: 16, fontSize: '0.58rem',
                                                                        fontWeight: 600,
                                                                        bgcolor: alpha(STATE_COLORS[card.state] ?? '#9e9e9e', 0.1),
                                                                        color: STATE_COLORS[card.state] ?? '#9e9e9e',
                                                                    }}/>
                                                                )}
                                                                <Typography variant="caption"
                                                                            color="text.secondary"
                                                                            sx={{fontSize: '0.62rem'}}>
                                                                    {formatDueRelative(card.due)}
                                                                </Typography>
                                                            </Box>
                                                        }
                                                        secondaryTypographyProps={{component: 'div'}}
                                                    />
                                                </ListItem>
                                            </Paper>
                                        ))}
                                    </List>
                                </>
                            )}

                            {duePreview.length === 0 && deckStats.due_now === 0 && (
                                <Paper variant="outlined" sx={{
                                    p: 2, textAlign: 'center', borderRadius: 1.5, mb: 1.5,
                                }}>
                                    <CheckCircleOutlineIcon sx={{fontSize: 28, color: 'success.main', mb: 0.5}}/>
                                    <Typography variant="body2" color="text.secondary">
                                        No cards due right now.
                                    </Typography>
                                </Paper>
                            )}

                            <Divider sx={{my: 0.5}}/>
                            <Button fullWidth
                                    startIcon={optimizing ? <CircularProgress size={14}/> : <AutoFixHighIcon/>}
                                    onClick={handleOptimize}
                                    disabled={optimizing || deckStats.total_reviews < 20}
                                    size="small" sx={{mt: 0.5, borderRadius: 2, textTransform: 'none'}}>
                                {optimizing ? 'Optimising…' : 'Optimize Schedule'}
                            </Button>
                            {deckStats.total_reviews < 20 && deckStats.total_reviews > 0 && (
                                <Typography variant="caption" color="text.secondary" sx={{
                                    mt: 0.3, display: 'block', textAlign: 'center', fontSize: '0.62rem',
                                }}>
                                    Need 20 reviews to optimise ({deckStats.total_reviews}/20)
                                </Typography>
                            )}
                        </Box>
                    ) : null}
                </Box>
            </Box>

            <Snackbar open={!!optMessage} autoHideDuration={5000}
                      onClose={() => setOptMessage(null)}
                      anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}>
                {optMessage ? (
                    <Alert severity={optMessage.severity} onClose={() => setOptMessage(null)}
                           sx={{borderRadius: 2}}>
                        {optMessage.text}
                    </Alert>
                ) : undefined}
            </Snackbar>
        </>
    );
};