import {useState, useEffect, useRef} from 'react';
import {useNavigate} from 'react-router-dom';
import api, {logout} from '../../services/axiosClient';
import type {Message, ConversationSummary} from './types';
import {useAnki} from "../ankiNotes/AnkiContext.tsx";
import {useWebSocket} from "../../services/WebSocketContext.tsx";
import type {StorySummary} from "./StoriesPage.tsx";


export const useChatLogic = () => {
    const navigate = useNavigate();
    const currentUser = localStorage.getItem('username') || '';
    const token = localStorage.getItem('access_token');

    const {sendMessage, subscribe} = useWebSocket();
    const [attachedStory, setAttachedStory] = useState<StorySummary | null>(null);

    // --- DATA STATE ---
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);

    // --- MODAL DATA STATE ---
    const [friendsNoConv, setFriendsNoConv] = useState<string[]>([]);
    const [allFriends, setAllFriends] = useState<string[]>([]);

    // --- UI REFS/STATE ---
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
    const activeConversationIdRef = useRef<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const orphanedReviewsRef = useRef<Record<string, any>>({});

    // Keep ref in sync for Websocket
    useEffect(() => {
        activeConversationIdRef.current = activeConversationId;
    }, [activeConversationId]);

    // 1. API HELPER
    const markConversationAsRead = async (conversationId: string) => {
        try {
            await api.post(`/chat/conversations/${conversationId}/read`);
        } catch (err) {
            console.error("Failed to mark read", err);
        }
    };

    const fetchConversations = async () => {
        try {
            const response = await api.get("/chat/conversations/list");
            setConversations(response.data);
        } catch (err) {
            console.error("Failed to fetch conversations", err);
        }
    };

    useEffect(() => {
        if (token) fetchConversations();
    }, [token]);


    useEffect(() => {
        // Subscribe specifically to chat messages
        const unsubscribe = subscribe("chat_message", (data) => {

            setConversations((prevConv) => {
                const existingIndex = prevConv.findIndex(c => c.id === data.conversation_id);

                if (existingIndex > -1) {
                    const updatedConv = {
                        ...prevConv[existingIndex],
                        // Ensure we handle potentially missing fields if backend structure varies
                        last_message_preview: data.content.length <= 30 ? data.content : data.content.slice(0, 30) + "...",
                        last_message_at: data.timestamp,
                        unread_count: (data.conversation_id !== activeConversationIdRef.current) && data.from !== currentUser
                            ? (prevConv[existingIndex].unread_count || 0) + 1
                            : prevConv[existingIndex].unread_count || 0
                    };
                    const others = prevConv.filter(c => c.id !== data.conversation_id);
                    return [updatedConv, ...others];
                } else {
                    fetchConversations();
                    return prevConv;
                }
            });

            if (data.conversation_id === activeConversationIdRef.current) {
                const pendingReview = orphanedReviewsRef.current[data.message_id];
                setMessages((prev) => [
                    ...prev,
                    {
                        messageId: data.message_id,
                        from: data.from,
                        content: data.content,
                        timestamp: data.timestamp,
                        isMine: data.from === currentUser,
                        ankiReview: pendingReview ? {
                            tickedNotes: pendingReview.ticked_notes,
                            messageReview: pendingReview.message_review,
                            deckName: pendingReview.deck_name
                        } : undefined,
                        attachedStory: data.story_attachment ? {
                            id: data.story_attachment.story_id,
                            title: data.story_attachment.title,
                            difficulty_label: data.story_attachment.difficulty_label,
                            chunk_count: data.story_attachment.chunk_count,
                        } : undefined,

                    }
                ]);

                if (pendingReview) {
                    delete orphanedReviewsRef.current[data.message_id];
                }

                if (data.from !== currentUser) {
                    markConversationAsRead(data.conversation_id);
                }
            }
        });

        // Cleanup: Unsubscribe when this hook unmounts
        return () => {
            unsubscribe();
        };
    }, [subscribe, currentUser]); // Dependencies: subscribe is stable, currentUser might change


    useEffect(() => {
        const unsubscribe = subscribe("learning_update", (data: any) => {
            setMessages((prevMessages) => {
                // A. Try to find the message
                const messageExists = prevMessages.some(m => m.messageId === data.message_id);
                console.log("were here")
                console.log(messageExists);
                if (messageExists) {
                    // Standard Case: Message is there, update it.
                    return prevMessages.map((msg) => {
                        if (msg.messageId === data.message_id) {
                            return {
                                ...msg,
                                ankiReview: {
                                    tickedNotes: data.ticked_notes,
                                    messageReview: data.message_review,
                                    deckName: data.deck_name
                                }
                            };
                        }
                        return msg;
                    });
                } else {
                    // B. ORPHAN CASE: Message hasn't arrived yet.
                    // Store it in the buffer so the chat_message listener can find it later.
                    console.log(`buffered review for missing message: ${data.message_id}`);
                    orphanedReviewsRef.current[data.message_id] = data;
                    return prevMessages; // No UI change yet
                }
            });
        });

        return () => unsubscribe();
    }, [subscribe]);


    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
    }, [messages]);

    // 3. ACTIONS
    // src/components/chat/useChatLogic.ts

    const loadChatHistory = async (convId: string) => {
        try {
            const response = await api.get(`/chat/history/${convId}`);

            setMessages(response.data.map((msg: any) => ({
                from: msg.sender,
                messageId: msg.message_id,
                content: msg.content,
                timestamp: msg.timestamp,
                isMine: msg.sender === currentUser,


                attachedStory: msg.story_attachment ? {
                            id: msg.story_attachment.story_id,
                            title: msg.story_attachment.title,
                            difficulty_label: msg.story_attachment.difficulty_label,
                            chunk_count: msg.story_attachment.chunk_count,
                        } : undefined,

            })));
        } catch (err) {
            console.error("Failed to load history", err);
        }
    };

    const handleSelectConversation = async (conv: ConversationSummary) => {
        if (activeConversationId === conv.id) return;
        await markConversationAsRead(conv.id);
        setConversations(prev => prev.map(c => c.id === conv.id ? {...c, unread_count: 0} : c));
        setActiveConversationId(conv.id);
        setMessages([]);
        loadChatHistory(conv.id);
    };

    const handleSendMessage = (content: string) => {
        if (!content.trim() && !attachedStory) return;
        if (!activeConversationId) return;


        sendMessage({
            type: "chat_message",
            conversation_id: activeConversationId,
            content: content.trim(),
            deck_name: null,
            story_attachment: attachedStory ? {
                story_id: attachedStory.id,
                title: attachedStory.title,
                difficulty_label: attachedStory.difficulty_label,
                chunk_count: attachedStory.chunk_count,
            } : null,
        });

        setAttachedStory(null); // clear after send
    };


    const handleJumpToMessage = (messageId: string) => {
        const elementId = messageId
        console.log(elementId);
        const element = document.getElementById(elementId);
        console.log(element);
        if (element) {
            element.scrollIntoView({behavior: 'smooth', block: 'center'});
            setHighlightedMessageId(messageId);
            setTimeout(() => setHighlightedMessageId(null), 2000);
        } else {
            alert("Message not found in loaded history.");
        }
    };

    // 4. CREATION ACTIONS (Data Fetching Only)
    const fetchFriendsForNewChat = async () => {
        try {
            const res = await api.get("/friends/no-conversation");
            setFriendsNoConv(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchFriendsForGroup = async () => {
        try {
            const res = await api.get("/friends/list");
            setAllFriends(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const createGroup = async (name: string, members: string[]) => {
        try {
            const participants = [...members, currentUser];
            const res = await api.post("chat/conversations/initiate", {
                participants, is_group: true, group_name: name
            });
            await fetchConversations();
            const newId = res.data.conversation_id;
            setActiveConversationId(newId);
            loadChatHistory(newId);
            return true; // Success
        } catch (e) {
            console.error(e);
            return false;
        }
    };


    const deleteConversation = async (conversationId: string) => {
        try {
            // 1. Call Backend
            await api.delete(`/chat/conversations/${conversationId}`);

            // 2. Optimistic Update (Remove from UI immediately)
            setConversations((prev) => prev.filter((c) => c.id !== conversationId));

            // 3. If we were looking at that chat, close the window
            if (activeConversationId === conversationId) {
                setActiveConversationId(null);
            }
            return true;
        } catch (error) {
            console.error("Failed to delete conversation", error);
            alert("Failed to delete conversation"); // Simple feedback
            return false;
        }
    };

    const startDM = async (friendUsername: string) => {
        try {
            const res = await api.post("chat/conversations/initiate", {
                participants: [currentUser, friendUsername], is_group: false
            });
            await fetchConversations();
            setActiveConversationId(res.data.conversation_id);
            loadChatHistory(res.data.conversation_id);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    return {
        currentUser,
        conversations,
        activeConversationId,
        messages,
        highlightedMessageId,
        messagesEndRef,
        friendsNoConv,
        allFriends,
        attachedStory,
        setAttachedStory,
        handleSelectConversation,
        handleSendMessage,
        handleJumpToMessage,
        fetchFriendsForNewChat,
        fetchFriendsForGroup,
        createGroup,
        deleteConversation,
        startDM,
        handleLogout: () => {
            logout();
            navigate('/login');
        }
    };
};