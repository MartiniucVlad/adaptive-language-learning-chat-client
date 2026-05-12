import {useState, useEffect, useRef} from 'react';
import {Box, CssBaseline, IconButton, Tooltip} from '@mui/material';
import {alpha} from '@mui/material/styles';
import ForumIcon from '@mui/icons-material/Forum';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ChatIcon from '@mui/icons-material/Chat';
import {useChatLogic} from './useChatLogic';
import {ChatSidebar} from './ChatSidebar.tsx';
import {ChatWindow} from './ChatWindow';
import {SemanticSearchModal} from './modals/SemanticSearchModal';
import {NewChatModal} from './modals/NewChatModal';
import {SrsProvider} from "../a-srsNotes/SrsContext.tsx";
import {SrsSidebar} from "../a-srsNotes/SrsSidebar.tsx";
import {SrsReviewModal} from "../a-srsNotes/SrsReviewModal.tsx";
import {StoriesPage} from "./StoriesPage.tsx";
import {useWebSocket} from "../../services/WebSocketContext.tsx";
import {Group as PanelGroup, Panel, Separator as PanelResizeHandle} from 'react-resizable-panels';
import {DragProvider} from "./DragContext.tsx";

// ─── Multi-select toggle button for the activity strip ────────────────────────

interface StripButtonProps {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}

const StripButton = ({icon, label, active, onClick}: StripButtonProps) => (
    <Tooltip title={label} placement="right">
        <IconButton
            onClick={onClick}
            sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                color: active ? 'primary.main' : 'text.disabled',
                bgcolor: active ? alpha('#1976d2', 0.12) : 'transparent',
                borderLeft: active ? '3px solid' : '3px solid transparent',
                borderLeftColor: 'primary.main',
                transition: 'all 0.15s ease',
                '&:hover': {
                    bgcolor: active ? alpha('#1976d2', 0.2) : 'action.hover',
                    color: active ? 'primary.main' : 'text.primary',
                },
            }}
        >
            {icon}
        </IconButton>
    </Tooltip>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const MainPage = () => {
    const {
        conversations, activeConversationId, messages, currentUser,
        highlightedMessageId, messagesEndRef,
        friendsNoConv, allFriends,
        attachedStory, setAttachedStory,
        handleSelectConversation, handleSendMessage, handleJumpToMessage, handleLogout,
        fetchFriendsForNewChat, fetchFriendsForGroup, createGroup, deleteConversation, startDM
    } = useChatLogic();

    // FIX #2: All windows now default to closed (false)
    const [chatVisible, setChatVisible] = useState(false);
    const [storiesVisible, setStoriesVisible] = useState(false);
    const [srsVisible, setSrsVisible] = useState(false);
    const [chatWindowVisible, setChatWindowVisible] = useState(false);

    // Modal states
    const [isSemanticOpen, setIsSemanticOpen] = useState(false);
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [reviewDeckId, setReviewDeckId] = useState('');
    const [isReviewOpen, setIsReviewOpen] = useState(false);

    const {subscribe} = useWebSocket();
    const loadStoriesRef = useRef<() => void>(() => {});

    // Reference to apply resizable panel sizes imperatively
    const panelGroupRef = useRef<any>(null);

    // Custom Auto-Save to prevent size resets
    const savedSizesRef = useRef<Record<string, number[]>>({});

    useEffect(() => {
        const unsubscribe = subscribe("learning_update", (_data: any) => {});
        return () => unsubscribe();
    }, [subscribe]);

    const currentConv = conversations.find(c => c.id === activeConversationId);

    const handleOpenNewChatUI = () => {
        fetchFriendsForNewChat();
        setIsNewChatOpen(true);
    };
    const handleCreateDM = async (friend: string) => {
        if (await startDM(friend)) setIsNewChatOpen(false);
    };
    const handleCreateGroup = async (name: string, members: string[]) => {
        if (await createGroup(name, members)) setIsNewChatOpen(false);
    };

    const handleStartReview = (deckId: string) => {
        setReviewDeckId(deckId);
        setIsReviewOpen(true);
    };

    const handleReviewComplete = () => {
        setIsReviewOpen(false);
        setReviewDeckId('');
    };

    useEffect(() => {
        if (isNewChatOpen) fetchFriendsForGroup();
    }, [isNewChatOpen]);

    // ── Dynamic Layout Generation ─────────────────────────────────────────────

    const allPanelConfigs = [
        {
            id: 'chat',
            visible: chatVisible,
            toggle: () => setChatVisible(v => !v),
            icon: <ForumIcon fontSize="small"/>,
            label: "Chats",
            content: (
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <ChatSidebar
                        conversations={conversations}
                        activeId={activeConversationId}
                        currentUser={currentUser}
                        onSelect={handleSelectConversation}
                        onNewChat={handleOpenNewChatUI}
                        onLogout={handleLogout}
                    />
                </Box>
            ),
        },
        {
            id: 'stories',
            visible: storiesVisible,
            toggle: () => setStoriesVisible(v => !v),
            icon: <MenuBookIcon fontSize="small"/>,
            label: "Lesen (Stories)",
            content: (
                <StoriesPage
                    visible={storiesVisible}
                    onLoadStoriesRef={(fn) => { loadStoriesRef.current = fn; }}
                />
            ),
        },
        {
            id: 'srs',
            visible: srsVisible,
            toggle: () => setSrsVisible(v => !v),
            icon: <PsychologyIcon fontSize="small"/>,
            label: "Flashcards (SRS)",
            content: (
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <SrsSidebar
                        onClose={() => setSrsVisible(false)}
                        currentUser={currentUser || ""}
                        onStartReview={handleStartReview}
                    />
                </Box>
            ),
        },
        {
            id: 'chatwindow',
            visible: chatWindowVisible,
            toggle: () => setChatWindowVisible(v => !v),
            icon: <ChatIcon fontSize="small"/>,
            label: "Messages Window",
            content: (
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    <ChatWindow
                        activeId={activeConversationId}
                        conversation={currentConv}
                        messages={messages}
                        currentUser={currentUser}
                        highlightedMessageId={highlightedMessageId}
                        messagesEndRef={messagesEndRef}
                        onSendMessage={handleSendMessage}
                        onOpenSemanticSearch={() => setIsSemanticOpen(true)}
                        onToggleAnki={() => setSrsVisible(v => !v)}
                        isAnkiOpen={srsVisible}
                        onDeleteConversation={deleteConversation}
                        attachedStory={attachedStory}
                        onAttachStory={setAttachedStory}
                        onStoryAcquired={() => loadStoriesRef.current()}
                    />
                </Box>
            ),
        },
    ];

    // Filter down to only the ones that are toggled ON
    const activePanels = allPanelConfigs.filter(p => p.visible);

    // Generate a unique string key based on WHICH panels are open (e.g., "chat-srs-chatwindow")
    const layoutKey = activePanels.map(p => p.id).join('-') || 'empty';

    // Calculate sensible defaults for when a window is opened for the first time
    const equalSplit = activePanels.length > 0 ? Math.floor(100 / activePanels.length) : 100;
    const currentSavedSizes = savedSizesRef.current[layoutKey] || [];

    // Save sizes on every drag interaction
    const handleLayout = (sizes: number[]) => {
        savedSizesRef.current[layoutKey] = sizes;
    };

    // FIX #1: Use the imperative API to set layout sizes dynamically.
    // This removes the need for `key={layoutKey}` on the PanelGroup, so the Stories page never unmounts.
    useEffect(() => {
        const saved = savedSizesRef.current[layoutKey];
        if (saved && saved.length === activePanels.length && panelGroupRef.current) {
            // A tiny timeout allows React to mount the new Panel DOM nodes before enforcing sizes
            setTimeout(() => {
                if (panelGroupRef.current) {
                    panelGroupRef.current.setLayout(saved);
                }
            }, 10);
        }
    }, [layoutKey, activePanels.length]);

    // Interleave Panels and Separators dynamically
    const panelElements = activePanels.flatMap((panel, index) => [
        <Panel
            key={panel.id}
            id={panel.id} // Added id to track specific panels securely
            order={index} // Added order to guarantee proper dynamic rendering
            defaultSize={currentSavedSizes[index] ?? equalSplit}
            minSize={15}
        >
            {panel.content}
        </Panel>,
        // Add a separator unless it's the last panel
        ...(index < activePanels.length - 1 ? [
            <PanelResizeHandle
                key={`sep-${panel.id}`}
                style={{
                    width: '4px',
                    background: '#334155',
                    cursor: 'col-resize',
                    transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1976d2')}
                onMouseLeave={e => (e.currentTarget.style.background = '#334155')}
            />
        ] : [])
    ]);

    return (
        <SrsProvider>
            <DragProvider>
                <Box sx={{
                    display: 'flex',
                    height: '100%',
                    bgcolor: 'background.default',
                    overflow: 'hidden',
                }}>
                    <CssBaseline/>

                    {/* ── Activity strip ── */}
                    <Box sx={{
                        width: 52,
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        pt: 2,
                        gap: 1,
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                    }}>
                        {allPanelConfigs.map(panel => (
                            <StripButton
                                key={panel.id}
                                icon={panel.icon}
                                label={panel.label}
                                active={panel.visible}
                                onClick={panel.toggle}
                            />
                        ))}
                    </Box>

                    {/* ── Resizable panel area ── */}
                    {/* key={layoutKey} was removed from here to prevent state destruction */}
                    <PanelGroup
                        ref={panelGroupRef}
                        direction="horizontal"
                        onLayout={handleLayout}
                        style={{flex: 1, height: '100%'}}
                    >
                        {panelElements}
                    </PanelGroup>

                    {/* ── Fullscreen review modal (above everything) ── */}
                    {isReviewOpen && reviewDeckId && (
                        <SrsReviewModal
                            open={isReviewOpen}
                            onClose={handleReviewComplete}
                            deckId={reviewDeckId}
                            onComplete={handleReviewComplete}
                        />
                    )}

                    <SemanticSearchModal
                        open={isSemanticOpen}
                        onClose={() => setIsSemanticOpen(false)}
                        activeConversationId={activeConversationId}
                        onJumpToMessage={(id) => {
                            setIsSemanticOpen(false);
                            handleJumpToMessage(id);
                        }}
                    />

                    <NewChatModal
                        open={isNewChatOpen}
                        onClose={() => setIsNewChatOpen(false)}
                        currentUser={currentUser}
                        friendsNoConv={friendsNoConv}
                        allFriends={allFriends}
                        onStartDM={handleCreateDM}
                        onCreateGroup={handleCreateGroup}
                    />
                </Box>
            </DragProvider>
        </SrsProvider>
    );
};

export default MainPage;