import {Box, AppBar, Toolbar, Typography, Avatar, IconButton, Tooltip, Paper, useTheme} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School'; // Import School Icon
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import SemanticSearchPng from '../../assets/semantic-search-icon.png';
import Linkify from 'linkify-react';
import type {Message, ConversationSummary} from './types';
import {stringToColor, getInitials, getConversationName} from './utils';
import MessageInput from './MessageInput';
import {AnkiReviewNote} from '../ankiNotes/AnkiReviewNote.tsx';
import {useState} from "react";
import {ChatInfoDrawer} from "./modals/ChatInfoDrawer.tsx";

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
                           }: ChatWindowProps) => {
    const theme = useTheme(); // Access the full theme object
    const [isInfoOpen, setIsInfoOpen] = useState(false);

    // --- 1. Modern Empty State ---
    if (!activeId || !conversation) {
        return (
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                bgcolor: 'background.default', // Dynamic Background
                flex: 1
            }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        bgcolor: 'transparent'
                    }}
                >
                    <Box sx={{
                        width: 80, height: 80,
                        bgcolor: theme.palette.mode === 'light' ? '#e0e7ff' : '#312e81', // Indigo-100 vs Indigo-900
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2
                    }}>
                        <ChatBubbleOutlineIcon sx={{fontSize: 40, color: 'primary.main'}}/>
                    </Box>
                    <Typography variant="h6" sx={{color: 'text.primary', fontWeight: 700}}>
                        No Chat Selected
                    </Typography>
                    <Typography variant="body2" sx={{color: 'text.secondary', mt: 1}}>
                        Select a conversation from the sidebar to start messaging.
                    </Typography>
                </Paper>
            </Box>
        );
    }

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

                    // Define highlighting color based on mode
                    const highlightBg = theme.palette.mode === 'light' ? '#fff9c4' : '#423d04';

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
                                {/* --- 4. The Bubble --- */}
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: '12px 18px',
                                        maxWidth: '75%',
                                        borderRadius: '20px',
                                        borderTopRightRadius: isMine ? 4 : 20,
                                        borderTopLeftRadius: isMine ? 20 : 4,

                                        // --- Dynamic Colors ---
                                        // Mine: Primary Main
                                        // Theirs: Background Paper (White or Dark Grey)
                                        // Highlight: Special Yellow
                                        bgcolor: isHighlighted
                                            ? highlightBg
                                            : (isMine ? 'primary.main' : 'background.paper'),

                                        color: isHighlighted
                                            ? 'text.primary'
                                            : (isMine ? 'primary.contrastText' : 'text.primary'),

                                        // Border only for incoming messages
                                        border: isMine ? 'none' : '1px solid',
                                        borderColor: 'divider',

                                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                                        position: 'relative',
                                        wordWrap: 'break-word'
                                    }}
                                >
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

                                    <Typography
                                        variant="body1"
                                        sx={{
                                            lineHeight: 1.6,
                                            fontSize: '0.95rem',
                                            whiteSpace: 'pre-wrap',
                                            '& .chat-link': {
                                                // High contrast link color for "My" messages (usually white text), regular link color for "Theirs"
                                                color: isMine ? 'inherit' : 'primary.main',
                                                textDecoration: 'underline'
                                            }
                                        }}
                                    >
                                        <Linkify
                                            options={{target: '_blank', className: 'chat-link'}}>{msg.content}</Linkify>
                                    </Typography>

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

                            {/* Anki Review Note */}
                            {msg.ankiReview && (
                                <Box sx={{mt: 1}}>
                                    <AnkiReviewNote
                                        review={msg.ankiReview}
                                        isMine={isMine}
                                    />
                                </Box>
                            )}
                        </Box>
                    );
                })}
                <div ref={messagesEndRef}/>
            </Box>

            {/* Input */}
            <MessageInput onSend={onSendMessage}/>
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