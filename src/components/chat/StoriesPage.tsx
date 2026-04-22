import {useState, useEffect, useRef, useCallback} from 'react';
import {
    Box, Typography, Paper, Chip, IconButton, Tooltip,
    TextField, InputAdornment, Skeleton, Alert,
    Drawer, LinearProgress, Stack, Divider, Fade,
    CircularProgress, useTheme, Button
} from '@mui/material';
import api, {BASE_URL} from "../../services/axiosClient.ts";
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

import {alpha} from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CloseIcon from '@mui/icons-material/Close';
import SchoolIcon from '@mui/icons-material/School';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TranslateIcon from '@mui/icons-material/Translate';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {useDrag} from "./DragContext.tsx";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StorySummary {
    id: string;
    title: string;
    difficulty_label: string;
    difficulty_score: number;
    word_count: number;
    unique_word_count: number;
    chunk_count: number;
    created_at: string;
    is_public: boolean;
    tags: string[];
}

interface VocabEntry {
    lemma: string;
    surfaces: string[];
    dict_id: string;
    pos: string;
    gender?: string;
    plurals: string[];
    definitions: string[];
    form_word?: string;
    form_definitions?: string[];
    synonyms?: string[]

}

interface StoryChunk {
    chunk_index: number;
    content: string;
    vocabulary: VocabEntry[];
    word_count: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTY_COLORS: Record<string, string> = {
    A1: '#4ade80', A2: '#86efac',
    B1: '#60a5fa', B2: '#3b82f6',
    C1: '#f97316', C2: '#ef4444',
};

const DIFFICULTY_BG: Record<string, string> = {
    A1: '#052e16', A2: '#052e16',
    B1: '#172554', B2: '#172554',
    C1: '#431407', C2: '#450a0a',
};

// How many chunks to keep rendered above/below the viewport.
// Chunks outside this window are replaced with spacer divs.
const RENDER_BUFFER = 2;

// ─── API helpers ─────────────────────────────────────────────────────────────


async function fetchStories(): Promise<StorySummary[]> {
    const res = await api.get("/stories/get-user-stories");
    if (!res.data) throw new Error('Failed to load stories');
    return res.data;
}

async function fetchChunk(storyId: string, chunkIndex: number): Promise<StoryChunk> {
    const res = await api.get(`/stories/${storyId}/chunks/${chunkIndex}`);
    if (!res.data) throw new Error(`Failed to load chunk ${chunkIndex}`);
    return res.data;
}

async function deleteStory(storyId: string): Promise<void> {
    await api.delete(`/stories/${storyId}`);
}

// async function fetchStoryMeta(storyId: string): Promise<any> {
//     const res = await api.get("/stories/${storyId}");
//     if (!res.data) throw new Error('Failed to load story');
//     return res.data;
// }

// ─── Word Popup ───────────────────────────────────────────────────────────────

interface WordPopupProps {
    entry: VocabEntry;
    anchor: { x: number; y: number };
    onClose: () => void;
}

const WordPopup = ({entry, anchor, onClose}: WordPopupProps) => {
    const theme = useTheme();
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    const genderLabel: Record<string, string> = {m: 'der', f: 'die', n: 'das'};
    const hasFormInfo = entry.form_word && entry.form_definitions && entry.form_definitions.length > 0;

    return (
        <Fade in>
            <Paper
                ref={popupRef}
                elevation={8}
                sx={{
                    position: 'fixed',
                    left: Math.min(anchor.x, window.innerWidth - 280),
                    top: anchor.y + 12,
                    width: 260,
                    zIndex: 9999,
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    bgcolor: '#0f172a',
                    backdropFilter: 'blur(12px)',
                }}
            >
                {/* Header: lemma + gender + close button */}
                <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1}}>
                    <Box>
                        <Typography variant="h6" fontWeight={700} color="text.primary" sx={{lineHeight: 1}}>
                            {entry.gender && genderLabel[entry.gender]
                                ? `${genderLabel[entry.gender]} `
                                : ''}
                            {entry.lemma}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {entry.pos}
                            {entry.plurals?.length > 0
                                ? ` · Pl: ${entry.plurals[0]}`
                                : ''}
                        </Typography>
                    </Box>
                    <IconButton size="small" onClick={onClose} sx={{mt: -0.5, mr: -0.5}}>
                        <CloseIcon fontSize="small"/>
                    </IconButton>
                </Box>

                <Divider sx={{my: 1, borderColor: alpha('#fff', 0.08)}}/>

                {/* Form-of block: e.g. gezogen → "past participle of ziehen" */}
                {hasFormInfo && (
                    <>
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.25,
                            mb: 1,
                            px: 1,
                            py: 0.75,
                            borderRadius: 1,
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            border: '1px solid',
                            borderColor: alpha(theme.palette.primary.main, 0.15),
                        }}>
                            <Typography
                                variant="caption"
                                fontWeight={700}
                                color="primary.main"
                                sx={{fontSize: '0.7rem', letterSpacing: 0.6, textTransform: 'uppercase'}}
                            >
                                {entry.form_word}
                            </Typography>
                            {entry.form_definitions!.map((def, i) => (
                                <Typography
                                    key={i}
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{fontSize: '0.8rem', fontStyle: 'italic'}}
                                >
                                    {def}
                                </Typography>
                            ))}
                        </Box>
                        <Divider sx={{my: 1, borderColor: alpha('#fff', 0.08)}}/>
                    </>
                )}

                {/* Definitions */}
                <Box sx={{display: 'flex', flexDirection: 'column', gap: 0.75}}>
                    {entry.definitions.map((def, i) => (
                        <Box key={i} sx={{display: 'flex', alignItems: 'flex-start', gap: 1}}>
                            <TranslateIcon sx={{
                                fontSize: 14,
                                color: i === 0 ? 'primary.main' : 'text.disabled',
                                mt: 0.25,
                                flexShrink: 0,
                            }}/>
                            <Typography
                                variant="body2"
                                color={i === 0 ? 'text.primary' : 'text.secondary'}
                                sx={{fontSize: i === 0 ? '0.875rem' : '0.8rem'}}
                            >
                                {def}
                            </Typography>
                        </Box>
                    ))}
                </Box>
                {/* Synonyms */}
                {entry.synonyms && entry.synonyms.length > 0 && (
                    <>
                        <Divider sx={{my: 1, borderColor: alpha('#fff', 0.08)}}/>
                        <Box>
                            <Typography variant="caption" sx={{
                                color: 'text.disabled',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                display: 'block',
                                mb: 0.75,
                            }}>
                                Synonyms
                            </Typography>
                            <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5}}>
                                {entry.synonyms.map((syn, i) => (
                                    <Chip
                                        key={i}
                                        label={syn}
                                        size="small"
                                        sx={{
                                            height: 20,
                                            fontSize: '0.7rem',
                                            bgcolor: alpha('#fff', 0.05),
                                            color: 'text.secondary',
                                            border: '1px solid',
                                            borderColor: alpha('#fff', 0.08),
                                            '& .MuiChip-label': {px: 1},
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    </>
                )}
            </Paper>
        </Fade>
    );
};

// ─── Rendered Chunk ───────────────────────────────────────────────────────────

interface RenderedChunkProps {
    chunk: StoryChunk;
    chunkIndex: number;
    onWordClick: (entry: VocabEntry, anchor: { x: number; y: number }) => void;
}

const RenderedChunk = ({chunk, onWordClick}: RenderedChunkProps) => {
    // Build a lookup: surface word → vocab entry (case-insensitive)
    const vocabMap = new Map<string, VocabEntry>();
    chunk.vocabulary.forEach(v => {
        v.surfaces.forEach(surface => {
            vocabMap.set(surface.toLowerCase(), v);
        });
    });

    const theme = useTheme();

    const handleWordClick = (word: string, e: React.MouseEvent) => {
        const entry = vocabMap.get(word.toLowerCase());
        if (!entry) return;
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        onWordClick(entry, {x: rect.left, y: rect.bottom});
    };

    // Render paragraphs, tokenizing each word for click targets
    const paragraphs = chunk.content.split(/\n\n+/);

    return (
        <Box sx={{mb: 3}}>
            {paragraphs.map((para, pi) => {
                // Tokenize: split on spaces but keep punctuation attached to words
                const tokens = para.split(/(\s+)/);
                return (
                    <Typography
                        key={pi}
                        variant="body1"
                        component="p"
                        sx={{
                            mb: 2,
                            lineHeight: 1.95,
                            fontSize: '1.05rem',
                            color: 'text.primary',
                            letterSpacing: '0.01em',
                        }}
                    >
                        {tokens.map((token, ti) => {
                            if (/^\s+$/.test(token)) return token;
                            // Strip punctuation to find the word core
                            const wordCore = token.replace(/[^\wäöüÄÖÜß]/g, '');
                            const hasEntry = vocabMap.has(wordCore.toLowerCase());
                            return (
                                <Box
                                    key={ti}
                                    component="span"
                                    onClick={hasEntry ? (e) => handleWordClick(wordCore, e) : undefined}
                                    sx={hasEntry ? {
                                        cursor: 'pointer',
                                        borderBottom: '1px dotted',
                                        borderColor: alpha(theme.palette.primary.main, 0.5),
                                        borderRadius: '2px',
                                        transition: 'all 0.15s ease',
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.primary.main, 0.12),
                                            borderColor: 'primary.main',
                                            borderBottomStyle: 'solid',
                                        },
                                    } : {}}
                                >
                                    {token}
                                </Box>
                            );
                        })}
                    </Typography>
                );
            })}
        </Box>
    );
};

// ─── Story Reader ─────────────────────────────────────────────────────────────

interface StoryReaderProps {
    story: StorySummary;
    onBack: () => void;
    onDeleted: (storyId: string) => void;
}

const StoryReader = ({story, onBack, onDeleted}: StoryReaderProps) => {
    const theme = useTheme();

    // Refs for chunk tracking — avoids stale closure issues with useCallback
    const loadedChunks = useRef<Map<number, StoryChunk>>(new Map());
    const loadingChunks = useRef<Set<number>>(new Set());
    // Bumped whenever refs change to trigger a re-render
    const [chunkVersion, setChunkVersion] = useState(0);

    const [visibleRange, setVisibleRange] = useState<[number, number]>([
        0,
        Math.min(story.chunk_count - 1, RENDER_BUFFER * 2),
    ]);
    const [popup, setPopup] = useState<{ entry: VocabEntry; anchor: { x: number; y: number } } | null>(null);

    const [selectionButton, setSelectionButton] = useState<{
        x: number;
        y: number;
        text: string;
    } | null>(null);
    const [explanationPanel, setExplanationPanel] = useState<{
        selectedText: string;
        content: string;
        isStreaming: boolean;
    } | null>(null);

    const topSentinelRef = useRef<HTMLDivElement>(null);
    const bottomSentinelRef = useRef<HTMLDivElement>(null);
    const chunkRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const chunkHeights = useRef<Map<number, number>>(new Map());


    const handleTextSelection = useCallback(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();

        if (!text || text.length < 3) {
            setSelectionButton(null);
            return;
        }

        const range = selection!.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        setSelectionButton({
            text,
            x: rect.left + rect.width / 2,
            y: rect.top - 8,  // 8px above the selection
        });
    }, []);

// Hide button when selection is cleared
    useEffect(() => {
        const handleSelectionChange = () => {
            const text = window.getSelection()?.toString().trim();
            if (!text) setSelectionButton(null);
        };
        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, []);

    const handleExplain = useCallback(async (text: string) => {
        setSelectionButton(null);
        window.getSelection()?.removeAllRanges();
        setExplanationPanel({selectedText: text, content: '', isStreaming: true});

        try {
            const token = localStorage.getItem('access_token');

            const response = await fetch(`${BASE_URL}/stories/explain`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({selected_text: text}),
            });

            if (!response.ok) throw new Error('Request failed');

            const reader = response.body!.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const {done, value} = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, {stream: true});
                setExplanationPanel(prev =>
                    prev ? {...prev, content: prev.content + chunk} : prev
                );
            }

            setExplanationPanel(prev =>
                prev ? {...prev, isStreaming: false} : prev
            );
        } catch (e) {
            setExplanationPanel(prev =>
                prev ? {...prev, content: 'Failed to get explanation. Please try again.', isStreaming: false} : prev
            );
        }
    }, []);
    const loadChunk = useCallback(async (index: number) => {
        if (index < 0 || index >= story.chunk_count) return;
        if (loadedChunks.current.has(index) || loadingChunks.current.has(index)) return;

        loadingChunks.current.add(index);
        setChunkVersion(v => v + 1); // show skeleton

        try {
            const chunk = await fetchChunk(story.id, index);
            loadedChunks.current.set(index, chunk);
            setChunkVersion(v => v + 1); // show content
        } catch (e) {
            console.error(`Failed to load chunk ${index}`, e);
        } finally {
            loadingChunks.current.delete(index);
        }
    }, [story.id, story.chunk_count]); // stable deps only

    // Initial load: first few chunks
    useEffect(() => {
        const toLoad = Array.from(
            {length: Math.min(story.chunk_count, RENDER_BUFFER * 2 + 1)},
            (_, i) => i
        );
        toLoad.forEach(loadChunk);
    }, [story.id]); // eslint-disable-line

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;
        const scrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;

        let centerChunk = 0;
        let accumulated = 0;
        for (let i = 0; i < story.chunk_count; i++) {
            const h = chunkHeights.current.get(i) ?? 400;
            if (accumulated + h > scrollTop + containerHeight / 2) {
                centerChunk = i;
                break;
            }
            accumulated += h;
        }

        const newMin = Math.max(0, centerChunk - RENDER_BUFFER);
        const newMax = Math.min(story.chunk_count - 1, centerChunk + RENDER_BUFFER);
        setVisibleRange([newMin, newMax]);

        for (let i = newMin; i <= newMax + 1; i++) {
            loadChunk(i);
        }
    }, [story.chunk_count, loadChunk]);

    // Measure chunk heights for spacer calculation
    useEffect(() => {
        chunkRefs.current.forEach((el, index) => {
            if (el) chunkHeights.current.set(index, el.offsetHeight);
        });
    });

    const getSpacerHeight = (fromIndex: number, toIndex: number): number => {
        let total = 0;
        for (let i = fromIndex; i <= toIndex; i++) {
            total += chunkHeights.current.get(i) ?? 400;
        }
        return total;
    };

    const diffColor = DIFFICULTY_COLORS[story.difficulty_label] ?? '#94a3b8';
    const diffBg = DIFFICULTY_BG[story.difficulty_label] ?? '#1e293b';

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            position: 'relative'
        }}>            {/* Header */}
            <Box sx={{
                px: 3, py: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                bgcolor: 'background.paper',
                flexShrink: 0,
            }}>
                <IconButton onClick={onBack} size="small">
                    <ArrowBackIcon/>
                </IconButton>
                <Box sx={{flex: 1, minWidth: 0}}>
                    <Typography variant="subtitle1" fontWeight={700} noWrap color="text.primary">
                        {story.title}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                            label={story.difficulty_label}
                            size="small"
                            sx={{
                                bgcolor: diffBg,
                                color: diffColor,
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                height: 20,
                                border: `1px solid ${alpha(diffColor, 0.4)}`,
                            }}
                        />
                        <Typography variant="caption" color="text.secondary">
                            {story.word_count?.toLocaleString()} words · {story.chunk_count} sections
                        </Typography>
                    </Stack>
                </Box>
                <Tooltip title="Click any underlined word to see its definition">
                    <IconButton size="small" sx={{color: 'text.secondary'}}>
                        <InfoOutlinedIcon fontSize="small"/>
                    </IconButton>

                </Tooltip>
                <Tooltip title="Delete story">
                    <IconButton
                        size="small"
                        onClick={async () => {
                            if (!confirm(`Delete "${story.title}"? This cannot be undone.`)) return;
                            await deleteStory(story.id);
                            onDeleted(story.id);
                            onBack();
                        }}
                        sx={{color: alpha('#ef4444', 0.6), '&:hover': {color: '#ef4444'}}}
                    >
                        <DeleteOutlineIcon fontSize="small"/>
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Scrollable reading area */}
            <Box
                onScroll={handleScroll}
                onMouseUp={handleTextSelection}
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    px: {xs: 2, sm: 4, md: 8},
                    py: 4,
                    maxWidth: 720,
                    mx: 'auto',
                    width: '100%',
                    boxSizing: 'border-box',
                    // Extra bottom padding so last content isn't hidden behind the panel
                    pb: explanationPanel ? '42%' : 4,
                    transition: 'padding-bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                {visibleRange[0] > 0 && (
                    <Box sx={{height: getSpacerHeight(0, visibleRange[0] - 1)}}/>
                )}

                {Array.from({length: story.chunk_count}, (_, i) => i)
                    .filter(i => i >= visibleRange[0] && i <= visibleRange[1])
                    .map(i => {
                        // Read from refs — always current, no stale closure
                        const chunk = loadedChunks.current.get(i);
                        const isLoading = loadingChunks.current.has(i);

                        return (
                            <Box
                                key={i}
                                ref={el => {
                                    if (el) chunkRefs.current.set(i, el);
                                    else chunkRefs.current.delete(i);
                                }}
                            >
                                {i > 0 && (
                                    <Box sx={{display: 'flex', alignItems: 'center', gap: 2, my: 3}}>
                                        <Divider sx={{flex: 1, borderColor: alpha('#fff', 0.06)}}/>
                                        <Typography variant="caption" color="text.disabled" sx={{fontSize: '0.65rem'}}>
                                            {i + 1} / {story.chunk_count}
                                        </Typography>
                                        <Divider sx={{flex: 1, borderColor: alpha('#fff', 0.06)}}/>
                                    </Box>
                                )}

                                {chunk ? (
                                    <RenderedChunk
                                        chunk={chunk}
                                        chunkIndex={i}
                                        onWordClick={(entry, anchor) => setPopup({entry, anchor})}
                                    />
                                ) : isLoading ? (
                                    <Box sx={{py: 2}}>
                                        {[100, 85, 95, 70, 88].map((w, j) => (
                                            <Skeleton key={j} variant="text" width={`${w}%`} height={28}
                                                      sx={{mb: 0.5}}/>
                                        ))}
                                    </Box>
                                ) : (
                                    <Box sx={{height: 200}}/>
                                )}
                            </Box>
                        );
                    })
                }

                {visibleRange[1] < story.chunk_count - 1 && (
                    <Box sx={{height: getSpacerHeight(visibleRange[1] + 1, story.chunk_count - 1)}}/>
                )}

                <Box sx={{textAlign: 'center', py: 6, color: 'text.disabled'}}>
                    <Typography variant="caption">— Ende —</Typography>
                </Box>
            </Box>

            {popup && (
                <WordPopup
                    entry={popup.entry}
                    anchor={popup.anchor}
                    onClose={() => setPopup(null)}
                />
            )}
            {selectionButton && (
                <Box
                    onClick={() => handleExplain(selectionButton.text)}
                    sx={{
                        position: 'fixed',
                        left: selectionButton.x,
                        top: selectionButton.y,
                        transform: 'translate(-50%, -100%)',
                        zIndex: 9000,
                        px: 1.5,
                        py: 0.6,
                        borderRadius: 1.5,
                        bgcolor: '#0f172a',
                        border: '1px solid',
                        borderColor: alpha(theme.palette.primary.main, 0.6),
                        color: 'primary.main',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        cursor: 'pointer',
                        userSelect: 'none',
                        boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px ${alpha(theme.palette.primary.main, 0.2)}`,
                        transition: 'all 0.12s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.15),
                            borderColor: 'primary.main',
                        },
                        // Arrow pointing down
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            top: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            borderLeft: '5px solid transparent',
                            borderRight: '5px solid transparent',
                            borderTop: `5px solid ${alpha(theme.palette.primary.main, 0.6)}`,
                        }
                    }}
                >
                    <AutoStoriesIcon sx={{fontSize: 13}}/>
                    Explanation
                </Box>
            )}
            {/* Explanation panel — slides up from bottom, sits inside the reader layout */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: explanationPanel ? '38%' : 0,
                    minHeight: explanationPanel ? 200 : 0,
                    transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    overflow: 'hidden',
                    zIndex: 100,
                    bgcolor: '#080f1a',
                    borderTop: explanationPanel ? '1px solid' : 'none',
                    borderColor: alpha(theme.palette.primary.main, 0.2),
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {explanationPanel && (
                    <>
                        {/* Panel header */}
                        <Box sx={{
                            px: 2.5,
                            py: 1.25,
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: 2,
                            borderBottom: '1px solid',
                            borderColor: alpha('#fff', 0.06),
                            flexShrink: 0,
                        }}>
                            <Box sx={{flex: 1, minWidth: 0}}>
                                <Typography variant="caption" sx={{
                                    color: 'primary.main',
                                    fontWeight: 700,
                                    fontSize: '0.65rem',
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    display: 'block',
                                    mb: 0.25,
                                }}>
                                    Explanation
                                </Typography>
                                {/* The selected text — truncated */}
                                <Typography variant="caption" sx={{
                                    color: alpha('#fff', 0.35),
                                    fontSize: '0.7rem',
                                    fontStyle: 'italic',
                                    display: 'block',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    "{explanationPanel.selectedText}"
                                </Typography>
                            </Box>
                            <IconButton
                                size="small"
                                onClick={() => setExplanationPanel(null)}
                                sx={{color: alpha('#fff', 0.4), flexShrink: 0, mt: -0.5}}
                            >
                                <CloseIcon sx={{fontSize: 16}}/>
                            </IconButton>
                        </Box>

                        {/* Panel body — scrollable */}
                        <Box sx={{
                            flex: 1,
                            overflowY: 'auto',
                            px: 2.5,
                            py: 2,
                            '&::-webkit-scrollbar': {width: 4},
                            '&::-webkit-scrollbar-track': {bgcolor: 'transparent'},
                            '&::-webkit-scrollbar-thumb': {
                                bgcolor: alpha(theme.palette.primary.main, 0.3),
                                borderRadius: 2,
                            },
                        }}>
                            {explanationPanel.isStreaming && !explanationPanel.content ? (
                                // Loading skeleton
                                <Box sx={{display: 'flex', flexDirection: 'column', gap: 1}}>
                                    {[90, 75, 85, 60].map((w, i) => (
                                        <Skeleton
                                            key={i}
                                            variant="text"
                                            width={`${w}%`}
                                            sx={{bgcolor: alpha('#fff', 0.06)}}
                                        />
                                    ))}
                                </Box>
                            ) : (
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: alpha('#fff', 0.85),
                                        lineHeight: 1.8,
                                        fontSize: '0.875rem',
                                        whiteSpace: 'pre-wrap',
                                    }}
                                >
                                    {explanationPanel.content}
                                    {/* Blinking cursor while streaming */}
                                    {explanationPanel.isStreaming && (
                                        <Box
                                            component="span"
                                            sx={{
                                                display: 'inline-block',
                                                width: '2px',
                                                height: '1em',
                                                bgcolor: 'primary.main',
                                                ml: 0.25,
                                                verticalAlign: 'text-bottom',
                                                '@keyframes blink': {
                                                    '0%, 100%': {opacity: 1},
                                                    '50%': {opacity: 0},
                                                },
                                                animation: 'blink 1s step-end infinite',
                                            }}
                                        />
                                    )}
                                </Typography>
                            )}
                        </Box>
                    </>
                )}
            </Box>
        </Box>
    );
};

// ─── Story Card ───────────────────────────────────────────────────────────────

interface StoryCardProps {
    story: StorySummary;
    onOpen: (story: StorySummary) => void;
}

const StoryCard = ({story, onOpen}: StoryCardProps) => {
    const theme = useTheme();
    const diffColor = DIFFICULTY_COLORS[story.difficulty_label] ?? '#94a3b8';
    const diffBg = DIFFICULTY_BG[story.difficulty_label] ?? '#1e293b';
    const {setDraggedStory} = useDrag();

    return (
        <Paper
            draggable
            onDragStart={(e) => {
                setDraggedStory(story);
                // Ghost image — browser default is fine, but you can customize:
                e.dataTransfer.effectAllowed = 'copy';
                // Store as JSON fallback for cross-window drops (future-proofing)
                e.dataTransfer.setData('application/x-story', JSON.stringify({
                    story_id: story.id,
                    title: story.title,
                    difficulty_label: story.difficulty_label,
                    chunk_count: story.chunk_count,
                }));
            }}
            onDragEnd={() => setDraggedStory(null)}
            onClick={() => onOpen(story)} elevation={0}
            sx={{
                p: 2.5,
                mb: 1.5,
                mx: 1,
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: alpha('#fff', 0.06),
                bgcolor: alpha('#fff', 0.03),
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                '&:hover': {
                    borderColor: alpha(theme.palette.primary.main, 0.35),
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    transform: 'translateY(-1px)',
                },
                '&:active': {cursor: 'grabbing'},
            }}
        >
            <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1}}>
                <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    color="text.primary"
                    sx={{flex: 1, mr: 1, lineHeight: 1.3}}
                >
                    {story.title}
                </Typography>
                <Chip
                    label={story.difficulty_label}
                    size="small"
                    sx={{
                        bgcolor: diffBg,
                        color: diffColor,
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        height: 18,
                        flexShrink: 0,
                        border: `1px solid ${alpha(diffColor, 0.35)}`,
                    }}
                />
            </Box>

            <Stack direction="row" spacing={2} sx={{mt: 1}}>
                <Typography variant="caption" color="text.secondary">
                    {story.word_count?.toLocaleString() ?? '—'} words
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {story.unique_word_count?.toLocaleString() ?? '—'} unique
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {story.chunk_count} sections
                </Typography>
            </Stack>

            {story.tags?.length > 0 && (
                <Stack direction="row" spacing={0.5} sx={{mt: 1.5, flexWrap: 'wrap', gap: 0.5}}>
                    {story.tags.map(tag => (
                        <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            sx={{
                                height: 16,
                                fontSize: '0.6rem',
                                bgcolor: alpha('#fff', 0.05),
                                color: 'text.secondary',
                            }}
                        />
                    ))}
                </Stack>
            )}
        </Paper>
    );
};

// ─── Upload Panel ─────────────────────────────────────────────────────────────

interface UploadPanelProps {
    onUploaded: () => void;
}

const UploadPanel = ({onUploaded}: UploadPanelProps) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const theme = useTheme();

    const ACCEPTED_TYPES = ['.txt', '.epub', '.pdf'];
    const ACCEPTED_MIME = ['text/plain', 'application/epub+zip', 'application/pdf'];

    const validateFile = (f: File): string | null => {
        if (!ACCEPTED_MIME.includes(f.type) && !ACCEPTED_TYPES.some(ext => f.name.endsWith(ext))) {
            return `Unsupported file type. Please upload a .txt, .epub, or .pdf file.`;
        }
        if (f.size > 5 * 1024 * 1024) {
            return 'File too large. Maximum size is 5MB.';
        }
        return null;
    };

    const handleFileSelected = (f: File) => {
        const err = validateFile(f);
        if (err) {
            setError(err);
            return;
        }
        setError(null);
        setFile(f);
        // Auto-populate title from filename if title is empty
        if (!title.trim()) {
            setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
        }
        // Clear manual content — file takes priority
        setContent('');
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) handleFileSelected(dropped);
    };

    const handleUpload = async () => {
        if (!title.trim()) return;
        if (!file && !content.trim()) return;

        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('title', title.trim());
            if (file) {
                formData.append('file', file);
            } else {
                formData.append('content', content.trim());
            }

            await api.post("/stories/upload", formData, {
                headers: {'Content-Type': 'multipart/form-data'},
            });

            setTitle('');
            setContent('');
            setFile(null);
            onUploaded();
        } catch (e: any) {
            setError(e.response?.data?.detail ?? e.message ?? 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const canSubmit = !uploading && title.trim() && (file || content.trim());

    return (
        <Box sx={{p: 2}}>
            <Typography variant="caption" color="text.secondary" sx={{
                display: 'block',
                mb: 1.5,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
            }}>
                Add a Story
            </Typography>

            <TextField
                fullWidth
                size="small"
                placeholder="Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                sx={{mb: 1.5}}
                slotProps={{
                    input: {
                        sx: {
                            borderRadius: 2,
                            bgcolor: alpha('#fff', 0.04),
                            fontSize: '0.875rem',
                        }
                    }
                }}
            />

            {/* File drop zone */}
            <Box
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !file && fileInputRef.current?.click()}
                sx={{
                    mb: 1.5,
                    p: 2,
                    borderRadius: 2,
                    border: '1px dashed',
                    borderColor: isDragOver
                        ? 'primary.main'
                        : file
                            ? alpha(theme.palette.success.main, 0.5)
                            : alpha('#fff', 0.12),
                    bgcolor: isDragOver
                        ? alpha(theme.palette.primary.main, 0.06)
                        : file
                            ? alpha(theme.palette.success.main, 0.04)
                            : alpha('#fff', 0.02),
                    cursor: file ? 'default' : 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    '&:hover': !file ? {
                        borderColor: alpha(theme.palette.primary.main, 0.5),
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                    } : {},
                }}
            >
                {file ? (
                    <>
                        <InsertDriveFileIcon sx={{fontSize: 20, color: 'success.main', flexShrink: 0}}/>
                        <Box sx={{flex: 1, minWidth: 0}}>
                            <Typography variant="caption" fontWeight={600} color="success.main" noWrap
                                        sx={{display: 'block'}}>
                                {file.name}
                            </Typography>
                            <Typography variant="caption" color="text.disabled" sx={{fontSize: '0.65rem'}}>
                                {(file.size / 1024).toFixed(0)} KB · {file.name.split('.').pop()?.toUpperCase()}
                            </Typography>
                        </Box>
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                setFile(null);
                            }}
                            sx={{color: 'text.disabled', flexShrink: 0}}
                        >
                            <CloseIcon sx={{fontSize: 14}}/>
                        </IconButton>
                    </>
                ) : (
                    <>
                        <UploadFileIcon sx={{
                            fontSize: 20,
                            color: isDragOver ? 'primary.main' : 'text.disabled',
                            flexShrink: 0,
                        }}/>
                        <Box>
                            <Typography variant="caption" color={isDragOver ? 'primary.main' : 'text.secondary'}
                                        fontWeight={600} sx={{display: 'block'}}>
                                {isDragOver ? 'Drop to upload' : 'Drop a file or click to browse'}
                            </Typography>
                            <Typography variant="caption" color="text.disabled" sx={{fontSize: '0.65rem'}}>
                                .txt · .epub · .pdf — max 5MB
                            </Typography>
                        </Box>
                    </>
                )}
            </Box>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.epub,.pdf"
                style={{display: 'none'}}
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelected(f);
                    e.target.value = ''; // reset so same file can be re-selected
                }}
            />

            {/* Divider with OR — only shown when no file is attached */}
            {!file && (
                <>
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1.5}}>
                        <Divider sx={{flex: 1, borderColor: alpha('#fff', 0.06)}}/>
                        <Typography variant="caption" color="text.disabled" sx={{fontSize: '0.65rem'}}>
                            or paste text
                        </Typography>
                        <Divider sx={{flex: 1, borderColor: alpha('#fff', 0.06)}}/>
                    </Box>

                    <TextField
                        fullWidth
                        multiline
                        rows={5}
                        size="small"
                        placeholder="Paste German text here…"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        sx={{mb: 1.5}}
                        slotProps={{
                            input: {
                                sx: {
                                    borderRadius: 2,
                                    bgcolor: alpha('#fff', 0.04),
                                    fontSize: '0.875rem',
                                    fontFamily: 'Georgia, serif',
                                    lineHeight: 1.7,
                                }
                            }
                        }}
                    />
                </>
            )}

            {error && (
                <Alert severity="error" sx={{mb: 1.5, fontSize: '0.75rem'}}>{error}</Alert>
            )}

            <Button
                fullWidth
                variant="contained"
                size="small"
                onClick={handleUpload}
                disabled={!canSubmit}
                startIcon={uploading ? <CircularProgress size={14} color="inherit"/> : <UploadFileIcon/>}
                sx={{borderRadius: 2, textTransform: 'none', fontWeight: 600}}
            >
                {uploading ? 'Processing…' : 'Upload Story'}
            </Button>
        </Box>
    );
};

// ─── Main StoriesPage ─────────────────────────────────────────────────────────

interface StoriesPageProps {
    visible: boolean; // controlled by the parent tab system
    onLoadStoriesRef?: (fn: () => void) => void;
}
    
export const StoriesPage = ({visible, onLoadStoriesRef}: StoriesPageProps) => {
    const [stories, setStories] = useState<StorySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [activeStory, setActiveStory] = useState<StorySummary | null>(null);
    const [showUpload, setShowUpload] = useState(false);

    const loadStories = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchStories();
            setStories(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleStoryDeleted = (storyId: string) => {
        setStories(prev => prev.filter(s => s.id !== storyId));
    };

    useEffect(() => {
        onLoadStoriesRef?.(loadStories);
        loadStories();
    }, [loadStories]);

    const filtered = stories.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
    );

    // When a story is open, show the reader instead of the list
    if (activeStory) {
        return (
            <Box sx={{height: '100%', display: visible ? 'flex' : 'none', flexDirection: 'column'}}>
                <StoryReader
                    story={activeStory}
                    onBack={() => setActiveStory(null)}
                    onDeleted={handleStoryDeleted}
                />
            </Box>
        );
    }

    return (
        <Box sx={{
            display: visible ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100%',
            bgcolor: 'background.paper',
        }}>
            {/* Header */}
            <Box sx={{p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #1d4ed8, #1e40af)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: 3,
                    }}>
                        <MenuBookIcon sx={{fontSize: 18, color: '#fff'}}/>
                    </Box>
                    <Typography variant="h6" fontWeight="bold" color="text.primary">
                        Lesen
                    </Typography>
                </Stack>
                <Tooltip title="Upload a story">
                    <IconButton
                        onClick={() => setShowUpload(!showUpload)}
                        size="small"
                        sx={{
                            bgcolor: showUpload ? 'primary.main' : 'transparent',
                            color: showUpload ? '#fff' : 'text.secondary',
                            '&:hover': {bgcolor: showUpload ? 'primary.dark' : 'action.hover'},
                            transition: 'all 0.2s',
                        }}
                    >
                        <UploadFileIcon fontSize="small"/>
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Upload panel (collapsible) */}
            {showUpload && (
                <Fade in>
                    <Box>
                        <Divider sx={{borderColor: 'divider'}}/>
                        <UploadPanel
                            onUploaded={() => {
                                setShowUpload(false);
                                loadStories();
                            }}
                        />
                        <Divider sx={{borderColor: 'divider'}}/>
                    </Box>
                </Fade>
            )}

            {/* Search */}
            <Box sx={{px: 2, pb: 1.5, maxWidth: 300}}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Search stories"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" fontSize="small"/>
                                </InputAdornment>
                            ),
                            sx: {
                                borderRadius: 4,
                                bgcolor: 'action.hover',
                                '& fieldset': {border: 'none'},
                            }
                        }
                    }}
                />
            </Box>

            {/* Difficulty legend */}
            <Box sx={{px: 2, pb: 1.5, display: 'flex', gap: 0.75, flexWrap: 'wrap'}}>
                {Object.entries(DIFFICULTY_COLORS).map(([level, color]) => (
                    <Box key={level} sx={{display: 'flex', alignItems: 'center', gap: 0.4}}>
                        <Box sx={{width: 6, height: 6, borderRadius: '50%', bgcolor: color}}/>
                        <Typography variant="caption" sx={{color, fontSize: '0.65rem', fontWeight: 600}}>
                            {level}
                        </Typography>
                    </Box>
                ))}
            </Box>

            {/* Story list */}
            <Box sx={{flex: 1, overflowY: 'auto'}}>
                {loading ? (
                    Array.from({length: 4}).map((_, i) => (
                        <Box key={i} sx={{mx: 1, mb: 1.5}}>
                            <Skeleton variant="rounded" height={80} sx={{borderRadius: 2.5}}/>
                        </Box>
                    ))
                ) : error ? (
                    <Alert severity="error" sx={{mx: 2}}>{error}</Alert>
                ) : filtered.length === 0 ? (
                    <Box sx={{textAlign: 'center', py: 6, px: 2}}>
                        <SchoolIcon sx={{fontSize: 40, color: 'text.disabled', mb: 1}}/>
                        <Typography variant="body2" color="text.secondary">
                            {search ? 'No stories match your search' : 'No stories yet — upload one above'}
                        </Typography>
                    </Box>
                ) : (
                    filtered.map(story => (
                        <StoryCard key={story.id} story={story} onOpen={setActiveStory}/>
                    ))
                )}
            </Box>
        </Box>
    );
};
