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
    // STOP SILENCING ERRORS
    // We log it for debugging, but we throw it so the UI knows it failed.
    console.error(`AnkiConnect Error (${action}):`, error);
    throw error;
  }
};

// 1. Get list of all deck names
export const getDeckNames = async () => {
  // If invoke throws, this will throw automatically to the caller
  return await invoke('deckNames');
};

// 2. Get Due + Rated cards for a specific deck
export const getActiveDeckNotes = async (deckName: string) => {
  console.log(`[Frontend] Fetching cards for deck: ${deckName}`);

  const query = `"deck:${deckName}"`;

  // We let invoke() handle the throwing if network fails
  const noteIds = await invoke('findNotes', { query });

  console.log(`[Frontend] AnkiConnect found ${noteIds?.length || 0} IDs`);

  if (!noteIds || noteIds.length === 0) return [];

  // --- APPLY LIMIT HERE ---
  const limitedNoteIds = noteIds.slice(0, 60);

  // This will also throw if network fails mid-operation
  const notesInfo = await invoke('notesInfo', { notes: limitedNoteIds });

  return notesInfo;
};