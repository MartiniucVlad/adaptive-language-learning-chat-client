
export interface ConversationSummary {
  id: string;
  participants: string[];
  admins: string[];
  type: 'private' | 'group';
  name: string | null;
  created_at: string;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface SemanticResult {
  messageId: string;
  content: string;
  sender: string;
  timestamp: string;
  score: number;
}

export interface AnkiReview {
  tickedNotes: Array<{ id: string; word: string }>;
  messageReview: string;
  deckName: string;
}

export interface StoryPreview {
    id: string;
    title: string;
    difficulty_label: string;
    chunk_count: number;
}

export interface Message {
  messageId: string;
  from: string;
  content: string;
  timestamp: string;
  isMine: boolean;
  ankiReview?: AnkiReview;
  attachedStory?: StoryPreview;
}


