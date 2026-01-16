// src/services/ankiService.ts
import axios from 'axios';

const ANKI_URL = 'http://localhost:8765';

export const invoke = async (action: string, params: any = {}) => {
  try {
    const response = await axios.post(ANKI_URL, {
      action,
      version: 6,
      params,
    });

    const result = response.data;

    if (Object.keys(result).length !== 2) {
      throw new Error('response has an unexpected number of fields');
    }
    if (!Object.prototype.hasOwnProperty.call(result, 'error')) {
      throw new Error('response is missing required error field');
    }
    if (!Object.prototype.hasOwnProperty.call(result, 'result')) {
      throw new Error('response is missing required result field');
    }
    if (result.error) {
      throw new Error(result.error);
    }

    return result.result;
  } catch (error) {
    console.error(`AnkiConnect Error (${action}):`, error);
    return null;
  }
};

// 1. Get list of all deck names
export const getDeckNames = async () => {
  return await invoke('deckNames') || [];
};

// 2. Get Due + Rated cards for a specific deck
// We fetch IDs first, then details (notesInfo)
// src/services/ankiService.ts

export const getActiveDeckNotes = async (deckName: string) => {
  console.log(`[Frontend] Fetching cards for deck: ${deckName}`);

  // Query all cards in the deck
  const query = `"deck:${deckName}"`;

  try {
    const noteIds = await invoke('findNotes', { query });

    console.log(`[Frontend] AnkiConnect found ${noteIds?.length || 0} IDs`);

    if (!noteIds || noteIds.length === 0) return [];

    // --- APPLY LIMIT HERE ---
    // Take only the first 60 IDs to send to the backend
    const limitedNoteIds = noteIds.slice(0, 60);
    console.log(`[Frontend] Limiting to first ${limitedNoteIds.length} cards`);

    // Get content for these specific notes
    const notesInfo = await invoke('notesInfo', { notes: limitedNoteIds });

    return notesInfo;
  } catch (err) {
    console.error("Error in getActiveDeckNotes", err);
    return [];
  }
};