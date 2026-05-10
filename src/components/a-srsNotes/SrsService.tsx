// src/services/SrsService.ts

import api from '../../services/axiosClient';


// ── Types ────────────────────────────────────────────────────────────────────

export interface CardFront {
  word: string;
  context_sentence?: string;
  part_of_speech?: string;
}

export interface CardBack {
  definition: string;
  gender?: string;
  plural?: string;
  example_sentence?: string;
  synonyms: string[];
  form_info?: string;
}

export interface CardResponse {
  card_id: string;
  deck_id: string;
  front: CardFront;
  back: CardBack;
  source_type?: string;
  source_id?: string;
  lemma: string;
  state: number;
  state_label: string;
  due: string;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  retrievability: number;
  created_at: string;
  updated_at: string;
}

export interface DeckResponse {
  deck_id: string;
  name: string;
  description?: string;
  language: string;
  card_count: number;
  due_count: number;
  new_count: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewSessionResponse {
  deck_id: string;
  cards: CardResponse[];
  total_due: number;
  returned: number;
}

export interface ReviewResultResponse {
  card: CardResponse;
  scheduling: {
    rating_label: string;
    previous_state: string;
    new_state: string;
    new_due: string;
    interval_days: number;
    message: string;
  };
}

export interface DeckStatsResponse {
  deck_id: string;
  deck_name: string;
  total_cards: number;
  due_now: number;
  new_cards: number;
  learning_cards: number;
  review_cards: number;
  relearning_cards: number;
  average_difficulty: number;
  average_stability: number;
  total_reviews: number;
  mature_cards: number;
}

export interface GlobalStatsResponse {
  total_decks: number;
  total_cards: number;
  total_due: number;
  total_reviews: number;
  cards_added_today: number;
  reviews_today: number;
}

export interface BulkCreateResult {
  created: number;
  skipped_duplicates: number;
  card_ids: string[];
}

export interface OptimizeResponse {
  status: string;
  message: string;
}

export interface OptimizationStatus {
  optimized: boolean;
  last_optimized: string | null;
  desired_retention?: number;
  uses_custom_params?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const POS_LABELS: Record<string, string> = {
  NOUN: 'Noun', VERB: 'Verb', ADJ: 'Adjective', ADV: 'Adverb',
  ADP: 'Preposition', CONJ: 'Conjunction', SCONJ: 'Conjunction',
  DET: 'Article', PRON: 'Pronoun', PROPN: 'Proper Noun',
  NUM: 'Number', PART: 'Particle', INTJ: 'Interjection', X: 'Other',
};

export const formatPos = (pos?: string): string =>
  POS_LABELS[pos ?? ''] ?? pos ?? '';

const STATE_LABELS: Record<number, string> = { 1: 'Learning', 2: 'Review', 3: 'Relearning' };
export const formatState = (state: number): string =>
  STATE_LABELS[state] ?? 'Unknown';

export const formatDueRelative = (dueIso: string): string => {
  const due = new Date(dueIso);
  const now = Date.now();
  const diffMs = due.getTime() - now;
  const absMin = Math.floor(Math.abs(diffMs) / 60000);
  const absHour = Math.floor(Math.abs(diffMs) / 3600000);
  const absDay = Math.floor(Math.abs(diffMs) / 86400000);

  if (diffMs < 0) {
    if (absMin < 60) return `overdue ${absMin}m`;
    if (absHour < 24) return `overdue ${absHour}h`;
    return `overdue ${absDay}d`;
  }
  if (absMin < 1) return 'due now';
  if (absMin < 60) return `${absMin}m`;
  if (absHour < 24) return `${absHour}h`;
  return `${absDay}d`;
};

export const isOverdue = (dueIso: string): boolean =>
  new Date(dueIso).getTime() < Date.now();

// ── API ──────────────────────────────────────────────────────────────────────

export const srsApi = {
  // Decks
  getDecks: () =>
    api.get<DeckResponse[]>('/srs/decks').then(r => r.data),

  createDeck: (data: { name: string; description?: string; language?: string }) =>
    api.post<DeckResponse>('/srs/decks', data).then(r => r.data),

  updateDeck: (deckId: string, data: { name?: string; description?: string }) =>
    api.patch<DeckResponse>(`/srs/decks/${deckId}`, data).then(r => r.data),

  deleteDeck: (deckId: string) =>
    api.delete(`/srs/decks/${deckId}`).then(r => r.data),

  getDeckStats: (deckId: string) =>
    api.get<DeckStatsResponse>(`/srs/decks/${deckId}/stats`).then(r => r.data),

  // Cards
  getCards: (deckId: string, params?: {
    state?: number; sort?: string; limit?: number; offset?: number;
  }) =>
    api.get<CardResponse[]>(`/srs/decks/${deckId}/cards`, { params })
      .then(r => r.data),

  deleteCard: (cardId: string) =>
    api.delete(`/srs/cards/${cardId}`).then(r => r.data),

  resetCard: (cardId: string) =>
    api.post<CardResponse>(`/srs/cards/${cardId}/reset`).then(r => r.data),

  bulkCreateCards: (
    deckId: string,
    cards: { front: CardFront; back: CardBack; source_type?: string;
             source_id?: string; lemma?: string }[],
    skipDuplicates = true,
  ) =>
    api.post<BulkCreateResult>(`/srs/decks/${deckId}/cards`, {
      cards, skip_duplicates: skipDuplicates,
    }).then(r => r.data),

  createCardFromStoryVocab: (
    deckId: string,
    data: { story_id: string; chunk_index: number; lemma: string; source_type?: string },
  ) =>
    api.post<CardResponse>(`/srs/decks/${deckId}/cards/from-story-vocab`, data)
      .then(r => r.data),

  // Review
  getReviewSession: (deckId: string, batchSize = 20) =>
    api.get<ReviewSessionResponse>(`/srs/decks/${deckId}/review`, {
      params: { batch_size: batchSize },
    }).then(r => r.data),

  submitReview: (cardId: string, rating: number, review_duration_ms?: number) =>
    api.post<ReviewResultResponse>(`/srs/cards/${cardId}/review`, {
      rating, review_duration_ms,
    }).then(r => r.data),

  // Stats & Optimisation
  getGlobalStats: () =>
    api.get<GlobalStatsResponse>('/srs/stats').then(r => r.data),

  optimizeScheduler: () =>
    api.post<OptimizeResponse>('/srs/optimize').then(r => r.data),

  getOptimizationStatus: () =>
    api.get<OptimizationStatus>('/srs/optimize/status').then(r => r.data),
};