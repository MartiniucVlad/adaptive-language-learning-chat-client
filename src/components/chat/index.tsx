import {useState, useEffect, useRef} from 'react';
import {Box, CssBaseline, IconButton, Tooltip} from '@mui/material';
import {alpha} from '@mui/material/styles';
import ForumIcon from '@mui/icons-material/Forum';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import {useChatLogic} from './useChatLogic';
import {ChatSidebar} from './ChatSidebar.tsx';
import {ChatWindow} from './ChatWindow';
import {SemanticSearchModal} from './modals/SemanticSearchModal';
import {NewChatModal} from './modals/NewChatModal';
import {AnkiSidebar} from "../ankiNotes/AnkiSidebar.tsx";
import {StoriesPage} from "./StoriesPage.tsx";
import {useWebSocket} from "../../services/WebSocketContext.tsx";
import {Group as PanelGroup, Panel, Separator as PanelResizeHandle} from 'react-resizable-panels';
import {DragProvider} from "./DragContext.tsx";

// ─── Tab button used in the slim sidebar strip ────────────────────────────────

interface TabButtonProps {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}

const TabButton = ({icon, label, active, onClick}: TabButtonProps) => (
    <Tooltip title={label} placement="right">
        <IconButton
            onClick={onClick}
            sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                color: active ? 'primary.main' : 'text.disabled',
                bgcolor: active ? alpha('#1976d2', 0.15) : 'transparent',
                border: '1px solid',
                borderColor: active ? alpha('#1976d2', 0.35) : 'transparent',
                transition: 'all 0.18s ease',
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

type SidebarTab = 'chats' | 'stories';

const ChatsPage = () => {
    const {
        conversations, activeConversationId, messages, currentUser,
        highlightedMessageId, messagesEndRef,
        friendsNoConv, allFriends,
        attachedStory,
        setAttachedStory,
        handleSelectConversation, handleSendMessage, handleJumpToMessage, handleLogout,
        fetchFriendsForNewChat, fetchFriendsForGroup, createGroup, deleteConversation, startDM
    } = useChatLogic();

    const [activeTab, setActiveTab] = useState<SidebarTab>('chats');
    const [isSemanticOpen, setIsSemanticOpen] = useState(false);
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [isAnkiOpen, setIsAnkiOpen] = useState(false);

    const {subscribe} = useWebSocket();
    const [lastAnkiEvent, setLastAnkiEvent] = useState(null);

    const loadStoriesRef = useRef<() => void>(() => {});

    useEffect(() => {
        const unsubscribe = subscribe("learning_update", (data: any) => {
            setLastAnkiEvent({type: "learning_update", ...data});
        });
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

    useEffect(() => {
        if (isNewChatOpen) fetchFriendsForGroup();
    }, [isNewChatOpen]);

    return (
        <DragProvider>
            <Box sx={{display: 'flex', height: '100%', bgcolor: 'background.default', overflow: 'hidden'}}>
                <CssBaseline/>
                <PanelGroup dir="horizontal" style={{height: '100%'}}>

                    {/* ── Left panel: tab strip + active sidebar ── */}
                    <Panel defaultSize={400} minSize={200}>
                        <Box sx={{display: 'flex', height: '100%'}}>

                            {/* Slim vertical tab strip */}
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
                                <TabButton
                                    icon={<ForumIcon fontSize="small"/>}
                                    label="Chats"
                                    active={activeTab === 'chats'}
                                    onClick={() => setActiveTab('chats')}
                                />
                                <TabButton
                                    icon={<MenuBookIcon fontSize="small"/>}
                                    label="Lesen (Stories)"
                                    active={activeTab === 'stories'}
                                    onClick={() => setActiveTab('stories')}
                                />
                            </Box>

                            {/* Sidebar content — both mounted, only one visible.
                            This keeps scroll position, loaded chunks, and search
                            state alive when switching tabs. */}
                            <Box sx={{flex: 1, minWidth: 0, overflow: 'hidden'}}>
                                {/* Chat sidebar — hidden via display:none when not active */}
                                <Box sx={{
                                    height: '100%',
                                    display: activeTab === 'chats' ? 'flex' : 'none',
                                    flexDirection: 'column',
                                }}>
                                    <ChatSidebar
                                        conversations={conversations}
                                        activeId={activeConversationId}
                                        currentUser={currentUser}
                                        onSelect={handleSelectConversation}
                                        onNewChat={handleOpenNewChatUI}
                                        onLogout={handleLogout}
                                    />
                                </Box>

                                {/* Stories sidebar — always mounted, visibility controlled by `visible` prop */}
                                <StoriesPage
                                    visible={activeTab === 'stories'}
                                    onLoadStoriesRef={(fn) => { loadStoriesRef.current = fn; }}
                                />
                            </Box>
                        </Box>
                    </Panel>

                    <PanelResizeHandle
                        style={{
                            width: '4px',
                            background: '#334155',
                            cursor: 'col-resize',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#1976d2')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#334155')}
                    />

                    {/* ── Right panel: chat window ── */}
                    <Panel minSize={40}>
                        <Box sx={{height: '100%', display: 'flex', flexDirection: 'column', position: 'relative'}}>
                            <ChatWindow
                                activeId={activeConversationId}
                                conversation={currentConv}
                                messages={messages}
                                currentUser={currentUser}
                                highlightedMessageId={highlightedMessageId}
                                messagesEndRef={messagesEndRef}
                                onSendMessage={handleSendMessage}
                                onOpenSemanticSearch={() => setIsSemanticOpen(true)}
                                onToggleAnki={() => setIsAnkiOpen(!isAnkiOpen)}
                                isAnkiOpen={isAnkiOpen}
                                onDeleteConversation={deleteConversation}
                                attachedStory={attachedStory}
                                onAttachStory={setAttachedStory}
                                onStoryAcquired={() => loadStoriesRef.current()}
                            />
                        </Box>
                    </Panel>

                </PanelGroup>

                <AnkiSidebar
                    open={isAnkiOpen}
                    lastAnkiEvent={lastAnkiEvent}
                    onClose={() => setIsAnkiOpen(false)}
                    currentUser={currentUser || ""}
                />

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
    );
};

export default ChatsPage;
