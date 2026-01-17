import { useState, useEffect } from 'react';
import { Box, CssBaseline } from '@mui/material';
import { useChatLogic } from './useChatLogic';
import { ChatSidebar } from './ChatSidebar.tsx';
import { ChatWindow } from './ChatWindow';
import { SemanticSearchModal } from './modals/SemanticSearchModal';
import { NewChatModal } from './modals/NewChatModal';
import { AnkiSidebar } from "../ankiNotes/AnkiSidebar.tsx";
import { useWebSocket } from "../../services/WebSocketContext.tsx";

const ChatsPage = () => {
  const {
    conversations, activeConversationId, messages, currentUser,
    highlightedMessageId, messagesEndRef,
    friendsNoConv, allFriends,
    handleSelectConversation, handleSendMessage, handleJumpToMessage, handleLogout,
    fetchFriendsForNewChat, fetchFriendsForGroup, createGroup, deleteConversation, startDM
  } = useChatLogic();

  const [isSemanticOpen, setIsSemanticOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isAnkiOpen, setIsAnkiOpen] = useState(false);

  const { subscribe } = useWebSocket();
  const [lastAnkiEvent, setLastAnkiEvent] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribe("learning_update", (data) => {
      setLastAnkiEvent({ type: "learning_update", ...data });
    });
    return () => unsubscribe();
  }, [subscribe]);

  const currentConv = conversations.find(c => c.id === activeConversationId);

  // ... (Modal handlers remain same) ...
  const handleOpenNewChatUI = () => { fetchFriendsForNewChat(); setIsNewChatOpen(true); };
  const handleCreateDM = async (friend: string) => { if (await startDM(friend)) setIsNewChatOpen(false); };
  const handleCreateGroup = async (name: string, members: string[]) => { if (await createGroup(name, members)) setIsNewChatOpen(false); };

  useEffect(() => { if (isNewChatOpen) fetchFriendsForGroup(); }, [isNewChatOpen]);

  return (
    <Box sx={{ display: 'flex', height: '100%', bgcolor: 'background.default', overflow: 'hidden' }}>
      <CssBaseline />

      <ChatSidebar
        conversations={conversations}
        activeId={activeConversationId}
        currentUser={currentUser}
        onSelect={handleSelectConversation}
        onNewChat={handleOpenNewChatUI}
        onLogout={handleLogout}
      />

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <ChatWindow
          activeId={activeConversationId}
          conversation={currentConv}
          messages={messages}
          currentUser={currentUser}
          highlightedMessageId={highlightedMessageId}
          messagesEndRef={messagesEndRef}
          onSendMessage={handleSendMessage}
          onOpenSemanticSearch={() => setIsSemanticOpen(true)}
          // --- PASS TOGGLE HANDLER DOWN ---
          onToggleAnki={() => setIsAnkiOpen(!isAnkiOpen)}
          isAnkiOpen={isAnkiOpen}
          onDeleteConversation={deleteConversation}
        />
      </Box>

      <AnkiSidebar
        open={isAnkiOpen}
        lastAnkiEvent={lastAnkiEvent}
        onClose={() => setIsAnkiOpen(false)}
        currentUser={currentUser || ""}
      />

      {/* Modals ... */}
      <SemanticSearchModal
        open={isSemanticOpen}
        onClose={() => setIsSemanticOpen(false)}
        activeConversationId={activeConversationId}
        onJumpToMessage={(id) => { setIsSemanticOpen(false); handleJumpToMessage(id); }}
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
  );
};

export default ChatsPage;