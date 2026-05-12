import {Box, AppBar, Toolbar, Typography, Avatar, IconButton, Tooltip, Paper, useTheme} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School'; // Import School Icon
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import SemanticSearchPng from '../../assets/semantic-search-icon.png';
import Linkify from 'linkify-react';
import type {Message, ConversationSummary} from './types';
import {stringToColor, getInitials, getConversationName} from './utils';
import MessageInput from './MessageInput';
import {AnkiReviewNote} from '../ankiNotes/AnkiReviewNote.tsx';
import {useState} from "react";
import {ChatInfoDrawer} from "./modals/ChatInfoDrawer.tsx";
import type {StorySummary} from "./StoriesPage.tsx";
import {useDrag} from './DragContext';
import CloseIcon from "@mui/icons-material/Close";
import {alpha} from "@mui/material/styles";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import api from "../../services/axiosClient.ts";

interface ChatWindowProps {
    activeId: string | null;
    conversation: ConversationSummary | undefined;
    messages: Message[];
    currentUser: string;
    highlightedMessageId: string | null;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;

    onSendMessage: (text: string) => void;
    onOpenSemanticSearch: () => void;

    onToggleAnki: () => void;
    isAnkiOpen: boolean;
    onDeleteConversation: (chatId: string) => void;
    attachedStory: StorySummary | null;
    onAttachStory: (story: StorySummary | null) => void;
    onStoryAcquired: () => void;
}

export const ChatWindow = ({
                               activeId,
                               conversation,
                               messages,
                               currentUser,
                               highlightedMessageId,
                               messagesEndRef,
                               onSendMessage,
                               onOpenSemanticSearch,
                               onToggleAnki,
                               isAnkiOpen,
                               onDeleteConversation,
                               attachedStory,
                               onAttachStory,
                               onStoryAcquired

                           }: ChatWindowProps) => {
    const theme = useTheme(); // Access the full theme object
    const [isInfoOpen, setIsInfoOpen] = useState(false);

    const {draggedStory, setDraggedStory} = useDrag();
    const [isDragOver, setIsDragOver] = useState(false)

    const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());

    async function subscribeToStory(storyId: string): Promise<{ story_id: string; message: string }> {
        try {
            const res = await api.post(`/stories/${storyId}/subscribe`);
            return res.data;
        } catch (e: any) {
            const detail = e.response?.data?.detail;
            if (e.response?.status === 409) {
                throw new Error(detail ?? 'Already subscribed to this story.');
            }
            if (e.response?.status === 404) {
                throw new Error(detail ?? 'Story not found.');
            }
            throw new Error(detail ?? 'Failed to subscribe to story.');
        }
    }


    if (!activeId || !conversation)
        return

    const activeName = getConversationName(conversation, currentUser);

    return (
        <Box sx={{flex: 1, display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper'}}>

            {/* --- 2. Modern Flat Header --- */}
            <AppBar
                position="static"
                color="inherit"
                elevation={0}
                sx={{
                    bgcolor: 'background.paper',
                    borderBottom: 1,
                    borderColor: 'divider',
                    px: 2,
                    py: 0.5
                }}
            >
                <Toolbar disableGutters sx={{minHeight: '64px !important'}}>

                    {/* CLICKABLE INFO SECTION */}
                    <Box
                        onClick={() => setIsInfoOpen(true)}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            flexGrow: 1,
                            cursor: 'pointer',
                            borderRadius: 2,
                            p: 0.5,
                            mr: 2,
                            transition: 'background-color 0.2s',
                            '&:hover': {bgcolor: 'action.hover'}
                        }}
                    >
                        <Avatar sx={{
                            bgcolor: stringToColor(activeName),
                            width: 40, height: 40,
                            mr: 2,
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: '#fff' // Ensure initials are readable
                        }}>
                            {conversation.type === 'group' ? <GroupAddIcon fontSize='small'/> : getInitials(activeName)}
                        </Avatar>

                        <Box sx={{flexGrow: 1}}>
                            <Typography variant="subtitle1" fontWeight={700}
                                        sx={{lineHeight: 1.2, color: 'text.primary'}}>
                                {activeName}
                            </Typography>
                            <Typography variant="caption" sx={{color: 'text.secondary', fontWeight: 500}}>
                                {conversation.type === 'group' ? 'Group Chat' : 'Online'}
                            </Typography>
                        </Box>
                    </Box>
                    {/* 1. Semantic Search */}
                    <Tooltip title="Semantic Search">
                        <IconButton onClick={onOpenSemanticSearch} sx={{
                            color: 'action.active',
                            '&:hover': {color: 'primary.main', bgcolor: 'action.hover'}
                        }}>
                            <img src={SemanticSearchPng} alt="Semantic Search" style={{
                                width: '22px',
                                height: '22px',
                                opacity: 0.8,
                                filter: theme.palette.mode === 'dark' ? 'invert(1)' : 'none'
                            }}/>
                        </IconButton>
                    </Tooltip>

                    {/* 2. Anki Toggle (New Location) */}
                    <Tooltip title={isAnkiOpen ? "Close Learning Session" : "Open Learning Session"}>
                        <IconButton
                            onClick={onToggleAnki}
                            sx={{
                                color: isAnkiOpen ? 'secondary.main' : 'action.active',
                                bgcolor: isAnkiOpen ? 'secondary.light' : 'transparent', // Highlight when active
                                '&:hover': {
                                    color: 'secondary.dark',
                                    bgcolor: isAnkiOpen ? 'secondary.light' : 'action.hover'
                                },
                                mx: 0.5
                            }}
                        >
                            <SchoolIcon/>
                        </IconButton>
                    </Tooltip>

                </Toolbar>
            </AppBar>

            {/* --- 3. Clean Chat Area --- */}
            <Box sx={{
                flex: 1,
                p: 3,
                overflowY: 'auto',
                bgcolor: 'background.default',
                // Dynamic Pattern: Dark dots on light bg, Light dots on dark bg
                backgroundImage: theme.palette.mode === 'light'
                    ? 'radial-gradient(#cbd5e1 1px, transparent 1px)'
                    : 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '24px 24px'
            }}>
                {messages.map((msg, index) => {
                    const isHighlighted = highlightedMessageId === msg.messageId;
                    const msgId = `${msg.messageId}`;
                    const isMine = msg.isMine;
                    const highlightBg = theme.palette.mode === 'light' ? '#fff9c4' : '#423d04';
                    const attachment = msg.attachedStory;

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

                    return (
                        <Box
                            key={index}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: isMine ? 'flex-end' : 'flex-start',
                                mb: msg.ankiReview ? 0 : 2
                            }}
                        >
                            <Box
                                id={msgId}
                                sx={{
                                    display: 'flex',
                                    justifyContent: isMine ? 'flex-end' : 'flex-start',
                                    width: '100%',
                                    transform: isHighlighted ? 'scale(1.02)' : 'scale(1)',
                                    transition: 'transform 0.3s ease-in-out',
                                }}
                            >
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: '12px 18px',
                                        maxWidth: '75%',
                                        borderRadius: '20px',
                                        borderTopRightRadius: isMine ? 4 : 20,
                                        borderTopLeftRadius: isMine ? 20 : 4,
                                        bgcolor: isHighlighted
                                            ? highlightBg
                                            : (isMine ? 'primary.main' : 'background.paper'),
                                        color: isHighlighted
                                            ? 'text.primary'
                                            : (isMine ? 'primary.contrastText' : 'text.primary'),
                                        border: isMine ? 'none' : '1px solid',
                                        borderColor: 'divider',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                                        position: 'relative',
                                        wordWrap: 'break-word',
                                        // Slightly wider when there's an attachment to give the card room
                                        minWidth: attachment ? 260 : 'unset',
                                    }}
                                >
                                    {/* Group sender name */}
                                    {conversation.type === 'group' && !isMine && (
                                        <Typography variant="caption" sx={{
                                            color: stringToColor(msg.from),
                                            fontWeight: 700,
                                            mb: 0.5,
                                            display: 'block'
                                        }}>
                                            {msg.from}
                                        </Typography>
                                    )}

                                    {/* Story attachment card */}
                                    {attachment && (
                                        <Box
                                            sx={{
                                                mb: msg.content ? 1.5 : 0,
                                                borderRadius: 2,
                                                overflow: 'hidden',
                                                border: '1px solid',
                                                borderColor: isMine
                                                    ? alpha('#fff', 0.18)
                                                    : alpha(theme.palette.primary.main, 0.2),
                                            }}
                                        >
                                            {/* Coloured top strip — acts as a visual anchor */}
                                            <Box sx={{
                                                height: 3,
                                                background: `linear-gradient(90deg, 
                                                ${DIFFICULTY_COLORS[attachment.difficulty_label] ?? '#60a5fa'}, 
                                                ${alpha(DIFFICULTY_COLORS[attachment.difficulty_label] ?? '#60a5fa', 0.3)})`,
                                            }}/>

                                            <Box sx={{
                                                px: 1.5,
                                                py: 1.25,
                                                bgcolor: isMine
                                                    ? alpha('#000', 0.18)
                                                    : alpha(theme.palette.primary.main, 0.05),
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.25,
                                            }}>
                                                {/* Icon */}
                                                <Box sx={{
                                                    width: 34,
                                                    height: 34,
                                                    borderRadius: 1.5,
                                                    bgcolor: isMine
                                                        ? alpha('#fff', 0.12)
                                                        : alpha(theme.palette.primary.main, 0.1),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}>
                                                    <MenuBookIcon sx={{
                                                        fontSize: 18,
                                                        color: isMine ? alpha('#fff', 0.85) : 'primary.main'
                                                    }}/>
                                                </Box>

                                                {/* Title + meta */}
                                                <Box sx={{flex: 1, minWidth: 0}}>
                                                    <Typography
                                                        variant="caption"
                                                        fontWeight={700}
                                                        noWrap
                                                        sx={{
                                                            display: 'block',
                                                            color: isMine ? alpha('#fff', 0.95) : 'text.primary',
                                                            fontSize: '0.8rem',
                                                            lineHeight: 1.3,
                                                        }}
                                                    >
                                                        {attachment.title}
                                                    </Typography>
                                                    <Box sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.75,
                                                        mt: 0.4
                                                    }}>
                                                        <Box sx={{
                                                            px: 0.6, py: 0.1, borderRadius: 0.75,
                                                            bgcolor: DIFFICULTY_BG[attachment.difficulty_label] ?? '#172554',
                                                            border: '1px solid',
                                                            borderColor: alpha(DIFFICULTY_COLORS[attachment.difficulty_label] ?? '#60a5fa', 0.4),
                                                        }}>
                                                            <Typography sx={{
                                                                fontSize: '0.6rem', fontWeight: 800,
                                                                color: DIFFICULTY_COLORS[attachment.difficulty_label] ?? '#60a5fa',
                                                                lineHeight: 1.4,
                                                            }}>
                                                                {attachment.difficulty_label}
                                                            </Typography>
                                                        </Box>
                                                        <Typography variant="caption" sx={{
                                                            fontSize: '0.68rem',
                                                            color: isMine ? alpha('#fff', 0.55) : 'text.disabled',
                                                        }}>
                                                            {attachment.chunk_count} sections
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </Box>

                                            {/* Acquire button + error — only shown on received messages */}
                                            {!isMine && (
                                                <Box sx={{px: 1.5, pb: 1.25}}>
                                                    <Box
                                                        onClick={async (e) => {
                                                            if (subscribedIds.has(attachment.id)) return;
                                                            const errorEl = (e.currentTarget.parentElement as HTMLElement)
                                                                .querySelector('.subscribe-error') as HTMLElement | null;
                                                            if (errorEl) errorEl.textContent = '';
                                                            try {
                                                                await subscribeToStory(attachment.id);
                                                                setSubscribedIds(prev => new Set(prev).add(attachment.id));
                                                                onStoryAcquired();
                                                            } catch (err: any) {
                                                                if (errorEl) errorEl.textContent = err.message;
                                                            }
                                                        }}
                                                        sx={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 0.5,
                                                            px: 1.25,
                                                            py: 0.4,
                                                            borderRadius: 1,
                                                            cursor: subscribedIds.has(attachment.id) ? 'default' : 'pointer',
                                                            bgcolor: subscribedIds.has(attachment.id)
                                                                ? alpha('#4ade80', 0.1)
                                                                : alpha(theme.palette.primary.main, 0.12),
                                                            border: '1px solid',
                                                            borderColor: subscribedIds.has(attachment.id)
                                                                ? alpha('#4ade80', 0.3)
                                                                : alpha(theme.palette.primary.main, 0.3),
                                                            transition: 'all 0.15s ease',
                                                            '&:hover': subscribedIds.has(attachment.id) ? {} : {
                                                                bgcolor: alpha(theme.palette.primary.main, 0.2),
                                                            },
                                                        }}
                                                    >
                                                        <MenuBookIcon sx={{
                                                            fontSize: 11,
                                                            color: subscribedIds.has(attachment.id) ? '#4ade80' : 'primary.main'
                                                        }}/>
                                                        <Typography sx={{
                                                            fontSize: '0.68rem',
                                                            fontWeight: 700,
                                                            color: subscribedIds.has(attachment.id) ? '#4ade80' : 'primary.main',
                                                        }}>
                                                            {subscribedIds.has(attachment.id) ? 'Added to library' : 'Acquire story'}
                                                        </Typography>
                                                    </Box>
                                                    <Typography className="subscribe-error" sx={{
                                                        fontSize: '0.68rem',
                                                        color: 'error.main',
                                                        mt: 0.5,
                                                        display: 'block',
                                                        minHeight: 0,
                                                    }}/>
                                                </Box>
                                            )}
                                        </Box>
                                    )}

                                    {/* Message text — only rendered if there's content */}
                                    {msg.content && (
                                        <Typography
                                            variant="body1"
                                            sx={{
                                                lineHeight: 1.6,
                                                fontSize: '0.95rem',
                                                whiteSpace: 'pre-wrap',
                                                '& .chat-link': {
                                                    color: isMine ? 'inherit' : 'primary.main',
                                                    textDecoration: 'underline'
                                                }
                                            }}
                                        >
                                            <Linkify options={{target: '_blank', className: 'chat-link'}}>
                                                {msg.content}
                                            </Linkify>
                                        </Typography>
                                    )}

                                    {/* Timestamp */}
                                    <Typography variant="caption" sx={{
                                        display: 'block',
                                        textAlign: 'right',
                                        mt: 0.5,
                                        fontSize: '0.7rem',
                                        opacity: 0.8,
                                        color: 'inherit'
                                    }}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </Typography>
                                </Paper>
                            </Box>

                            {msg.ankiReview && (
                                <Box sx={{mt: 1}}>
                                    <AnkiReviewNote review={msg.ankiReview} isMine={isMine}/>
                                </Box>
                            )}
                        </Box>
                    );
                })}
                <div ref={messagesEndRef}/>
            </Box>

            {/* Input */}
            <Box
                onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (draggedStory) {
                        onAttachStory(draggedStory);
                        setDraggedStory(null);
                    }
                }}
                sx={{
                    border: '1px solid',
                    borderColor: isDragOver
                        ? 'primary.main'
                        : 'transparent',
                    borderRadius: 2,
                    transition: 'border-color 0.15s ease',
                    bgcolor: isDragOver
                        ? alpha(theme.palette.primary.main, 0.05)
                        : 'transparent',
                }}
            >
                {/* Attachment preview — shown above the text input when a story is attached */}
                {attachedStory && (
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2,
                        py: 1,
                        mx: 1,
                        mb: 0.5,
                        borderRadius: 1.5,
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        border: '1px solid',
                        borderColor: alpha(theme.palette.primary.main, 0.2),
                    }}>
                        <MenuBookIcon sx={{fontSize: 16, color: 'primary.main', flexShrink: 0}}/>
                        <Box sx={{flex: 1, minWidth: 0}}>
                            <Typography variant="caption" fontWeight={700} color="primary.main" noWrap>
                                {attachedStory.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{display: 'block'}}>
                                {attachedStory.difficulty_label} · {attachedStory.chunk_count} sections
                            </Typography>
                        </Box>
                        <IconButton
                            size="small"
                            onClick={() => onAttachStory(null)}
                            sx={{color: 'text.secondary', flexShrink: 0}}
                        >
                            <CloseIcon sx={{fontSize: 14}}/>
                        </IconButton>
                    </Box>
                )}
                <MessageInput onSend={onSendMessage}/>
            </Box>

            <ChatInfoDrawer
                open={isInfoOpen}
                onClose={() => setIsInfoOpen(false)}
                conversation={conversation}
                currentUser={currentUser}
                onDeleteChat={onDeleteConversation}
            />
        </Box>
    );
};