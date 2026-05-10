// src/components/srs/SrsContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { srsApi, type DeckResponse, type GlobalStatsResponse } from './SrsService.tsx';

interface SrsContextType {
  decks: DeckResponse[];
  selectedDeckId: string | null;
  setSelectedDeckId: (id: string | null) => void;
  isReviewing: boolean;
  setIsReviewing: (v: boolean) => void;
  loading: boolean;
  globalStats: GlobalStatsResponse | null;
  refetchDecks: () => Promise<void>;
  refetchGlobalStats: () => Promise<void>;
  selectedDeck: DeckResponse | null;
}

const SrsContext = createContext<SrsContextType>({
  decks: [],
  selectedDeckId: null,
  setSelectedDeckId: () => {},
  isReviewing: false,
  setIsReviewing: () => {},
  loading: true,
  globalStats: null,
  refetchDecks: async () => {},
  refetchGlobalStats: async () => {},
  selectedDeck: null,
});

export const useSrs = () => useContext(SrsContext);

export const SrsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [decks, setDecks] = useState<DeckResponse[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState<GlobalStatsResponse | null>(null);

  // Check if the user is actually authenticated
  const isAuthenticated = !!localStorage.getItem('access_token');

  const refetchDecks = useCallback(async () => {
    // Guard: Don't fire if logged out
    if (!localStorage.getItem('access_token')) return;

    try {
      const data = await srsApi.getDecks();
      const validData = Array.isArray(data) ? data : [];
      setDecks(validData);
      if (selectedDeckId && !validData.some(d => d.deck_id === selectedDeckId)) {
        setSelectedDeckId(null);
      }
    } catch (err) {
      console.error('Failed to fetch decks:', err);
      setDecks([]);
    }
  }, [selectedDeckId]);

  const refetchGlobalStats = useCallback(async () => {
    // Guard: Don't fire if logged out
    if (!localStorage.getItem('access_token')) return;

    try {
      const data = await srsApi.getGlobalStats();
      setGlobalStats(data && typeof data === 'object' ? data : null);
    } catch (err) {
      console.error('Failed to fetch global stats:', err);
      setGlobalStats(null);
    }
  }, []);

  useEffect(() => {
    // ONLY fetch data if the user is actually logged in
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      await Promise.all([refetchDecks(), refetchGlobalStats()]);
      setLoading(false);
    })();
  }, [isAuthenticated]); // Re-run this effect when auth status changes

  const safeDecks = Array.isArray(decks) ? decks : [];
  const selectedDeck = safeDecks.find(d => d.deck_id === selectedDeckId) ?? null;

  return (
    <SrsContext.Provider
      value={{
        decks: safeDecks,
        selectedDeckId,
        setSelectedDeckId,
        isReviewing,
        setIsReviewing,
        loading,
        globalStats,
        refetchDecks,
        refetchGlobalStats,
        selectedDeck,
      }}
    >
      {children}
    </SrsContext.Provider>
  );
};