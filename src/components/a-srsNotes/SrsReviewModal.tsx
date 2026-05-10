// src/components/srs/SrsReviewModal.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Button, IconButton, Chip, Paper, Divider,
  Tooltip, Fade, Slide, CircularProgress, useTheme, Stack,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';

import { srsApi, formatPos, type CardResponse, ReviewResultResponse } from './SrsService.tsx';

// ── Types ────────────────────────────────────────────────────────────────────

interface SrsReviewModalProps {
  open: boolean;
  onClose: () => void;
  deckId: string;
  onComplete: () => void;
}

interface SessionResult {
  cardId: string;
  word: string;
  rating: number;
  ratingLabel: string;
  message: string;
  durationMs: number;
}

const RATING_CONFIG = [
  { value: 1, label: 'Again', color: '#d32f2f', bg: 'rgba(211, 47, 47, 0.1)', key: '1' },
  { value: 2, label: 'Hard',  color: '#ed6c02', bg: 'rgba(237, 108, 2, 0.1)', key: '2' },
  { value: 3, label: 'Good',  color: '#1976d2', bg: 'rgba(25, 118, 210, 0.1)', key: '3' },
  { value: 4, label: 'Easy',  color: '#2e7d32', bg: 'rgba(46, 125, 50, 0.1)', key: '4' },
] as const;

// ── Component ────────────────────────────────────────────────────────────────

export const SrsReviewModal: React.FC<SrsReviewModalProps> = ({
  open, onClose, deckId, onComplete,
}) => {
  const theme = useTheme();

  // Session state
  const [sessionCards, setSessionCards] = useState<CardResponse[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [totalDue, setTotalDue] = useState(0);

  // Per-card state
  const [answered, setAnswered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Session results for summary
  const [results, setResults] = useState<SessionResult[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  // Timing
  const cardShownAt = useRef<number>(Date.now());
  const sessionStartAt = useRef<number>(Date.now());

  const currentCard = sessionCards[currentIndex] ?? null;
  const isLastCard = currentIndex >= sessionCards.length - 1;
  const progressPercent = sessionCards.length > 0
    ? ((currentIndex + (answered ? 1 : 0)) / sessionCards.length) * 100 : 0;

  // ── Load session ──────────────────────────────────────────────────────────

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const session = await srsApi.getReviewSession(deckId, 30);
      if (session.cards.length === 0) {
        onComplete();
        onClose();
        return;
      }
      setSessionCards(session.cards);
      setTotalDue(session.total_due);
      setCurrentIndex(0);
      setAnswered(false);
      setFeedback(null);
      setResults([]);
      setShowSummary(false);
      cardShownAt.current = Date.now();
      sessionStartAt.current = Date.now();
    } catch (err) {
      console.error('Failed to load review session:', err);
      onClose();
    } finally {
      setLoading(false);
    }
  }, [deckId, onComplete, onClose]);

  useEffect(() => {
    if (open) loadSession();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    if (!open || showSummary || loading) return;

    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (!answered) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleReveal();
        }
      } else if (!submitting) {
        const idx = ['1', '2', '3', '4'].indexOf(e.key);
        if (idx !== -1) {
          e.preventDefault();
          handleRate(RATING_CONFIG[idx].value);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, answered, submitting, showSummary, loading, currentCard]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleReveal = () => {
    if (answered) return;
    setAnswered(true);
  };

  const handleRate = async (rating: number) => {
    if (!currentCard || submitting || !answered) return;
    setSubmitting(true);

    const durationMs = Date.now() - cardShownAt.current;

    try {
      const result: ReviewResultResponse = await srsApi.submitReview(
        currentCard.card_id,
        rating,
        durationMs,
      );

      // Record result
      setResults(prev => [...prev, {
        cardId: currentCard.card_id,
        word: currentCard.front.word,
        rating,
        ratingLabel: result.scheduling.rating_label,
        message: result.scheduling.message,
        durationMs,
      }]);

      // Show brief feedback
      setFeedback(result.scheduling.message);

      // Auto-advance after a short delay
      setTimeout(() => {
        setFeedback(null);
        if (isLastCard) {
          setShowSummary(true);
        } else {
          setCurrentIndex(prev => prev + 1);
          setAnswered(false);
          cardShownAt.current = Date.now();
        }
        setSubmitting(false);
      }, 700);
    } catch (err) {
      console.error('Failed to submit review:', err);
      setSubmitting(false);
    }
  };

  const handleFinish = () => {
    onComplete();
    onClose();
  };

  // ── Summary helpers ───────────────────────────────────────────────────────

  const ratingCounts = [1, 2, 3, 4].map(r => ({
    ...RATING_CONFIG[r - 1],
    count: results.filter(x => x.rating === r).length,
  }));

  const totalDurationSec = Math.round(
    (Date.now() - sessionStartAt.current) / 1000
  );
  const minutes = Math.floor(totalDurationSec / 60);
  const seconds = totalDurationSec % 60;

  // ── Render ────────────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: theme.zIndex.modal + 100,
      bgcolor: theme.palette.mode === 'light' ? '#fafafa' : 'background.default',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 3, py: 1.5, borderBottom: 1, borderColor: 'divider',
        bgcolor: 'background.paper',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" fontWeight={700} color="text.secondary">
            {currentIndex + 1} / {sessionCards.length}
          </Typography>
          {totalDue > sessionCards.length && (
            <Typography variant="caption" color="text.secondary">
              ({totalDue} total due)
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 120 }}>
            <Box sx={{
              height: 4, borderRadius: 2, bgcolor: 'action.hover', overflow: 'hidden',
            }}>
              <Box sx={{
                height: '100%', borderRadius: 2,
                width: `${progressPercent}%`,
                bgcolor: 'primary.main',
                transition: 'width 0.4s ease',
              }} />
            </Box>
          </Box>
          <Tooltip title="Finish session (Esc)">
            <IconButton size="small" onClick={handleFinish}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Card area ──────────────────────────────────────────────────────── */}
      <Box sx={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        px: 3, py: 4, overflow: 'auto',
      }}>
        {loading ? (
          <CircularProgress size={36} />
        ) : showSummary ? (
          /* ── Session summary ────────────────────────────────────────────── */
          <Fade in>
            <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
                Session Complete
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {results.length} cards reviewed · {minutes}m {seconds.toString().padStart(2, '0')}s
              </Typography>

              <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'center', mb: 4 }}>
                {ratingCounts.map(rc => (
                  <Paper key={rc.value} sx={{
                    px: 2.5, py: 1.5, textAlign: 'center', borderRadius: 2,
                    bgcolor: rc.bg, minWidth: 72,
                  }}>
                    <Typography variant="h5" fontWeight={800} sx={{ color: rc.color }}>
                      {rc.count}
                    </Typography>
                    <Typography variant="caption" fontWeight={600} sx={{ color: rc.color }}>
                      {rc.label}
                    </Typography>
                  </Paper>
                ))}
              </Stack>

              <Button variant="contained" size="large" onClick={handleFinish}
                sx={{ borderRadius: 2.5, px: 5, fontWeight: 700 }}>
                Done
              </Button>
            </Box>
          </Fade>
        ) : currentCard ? (
          <Fade in key={currentCard.card_id}>
            <Box sx={{ width: '100%', maxWidth: 560 }}>
              {/* ── Front ─────────────────────────────────────────────────── */}
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                {currentCard.front.part_of_speech && (
                  <Chip
                    label={formatPos(currentCard.front.part_of_speech)}
                    size="small"
                    sx={{
                      mb: 1.5, fontWeight: 600, fontSize: '0.75rem',
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      color: 'primary.main',
                    }}
                  />
                )}
                <Typography variant="h3" fontWeight={800} sx={{ mb: 1.5, lineHeight: 1.2 }}>
                  {currentCard.front.word}
                </Typography>
                {currentCard.front.context_sentence && (
                  <Paper
                    variant="outlined"
                    sx={{
                      display: 'inline-block', px: 3, py: 1.5,
                      borderRadius: 2, fontStyle: 'italic',
                      bgcolor: alpha(theme.palette.text.primary, 0.03),
                      maxWidth: '100%',
                    }}
                  >
                    <Typography variant="body1" color="text.secondary">
                      {currentCard.front.context_sentence}
                    </Typography>
                  </Paper>
                )}
              </Box>

              {/* Reveal button (before answer) */}
              {!answered && (
                <Box sx={{ textAlign: 'center' }}>
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<VisibilityIcon />}
                    onClick={handleReveal}
                    sx={{
                      borderRadius: 2.5, px: 4, fontWeight: 600,
                      borderColor: 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                  >
                    Show Answer
                  </Button>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Press Space or Enter
                  </Typography>
                </Box>
              )}

              {/* ── Back (after reveal) ──────────────────────────────────── */}
              {answered && (
                <Slide direction="up" in={answered} mountOnEnter unmountOnExit>
                  <Box>
                    <Divider sx={{ mb: 3 }} />

                    {/* Definition */}
                    <Paper variant="outlined" sx={{ p: 2.5, mb: 2, borderRadius: 2 }}>
                      <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1, letterSpacing: 0.5 }}>
                        DEFINITION
                      </Typography>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                        {currentCard.back.definition}
                      </Typography>
                    </Paper>

                    {/* Gender + Plural (nouns) */}
                    {currentCard.back.gender && (
                      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Chip label={currentCard.back.gender} size="small"
                          sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }} />
                        {currentCard.back.plural && (
                          <Chip label={`Pl: ${currentCard.back.plural}`} size="small"
                            sx={{ bgcolor: 'action.hover' }} />
                        )}
                      </Box>
                    )}

                    {/* Example sentence */}
                    {currentCard.back.example_sentence && (
                      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.03) }}>
                        <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 0.5, letterSpacing: 0.5 }}>
                          EXAMPLE
                        </Typography>
                        <Typography variant="body2">
                          {currentCard.back.example_sentence}
                        </Typography>
                      </Paper>
                    )}

                    {/* Synonyms */}
                    {currentCard.back.synonyms.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 0.5, display: 'block', letterSpacing: 0.5 }}>
                          SYNONYMS
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {currentCard.back.synonyms.map(s => (
                            <Chip key={s} label={s} size="small" variant="outlined"
                              sx={{ fontSize: '0.8rem' }} />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* Form info */}
                    {currentCard.back.form_info && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, fontStyle: 'italic' }}>
                        {currentCard.back.form_info}
                      </Typography>
                    )}

                    {/* Feedback toast */}
                    {feedback && (
                      <Fade in>
                        <Paper sx={{
                          p: 1.5, mb: 2, textAlign: 'center', borderRadius: 2,
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        }}>
                          <Typography variant="body2" fontWeight={600} color="primary">
                            {feedback}
                          </Typography>
                        </Paper>
                      </Fade>
                    )}
                  </Box>
                </Slide>
              )}
            </Box>
          </Fade>
        ) : null}
      </Box>

      {/* ── Rating buttons (bottom bar) ────────────────────────────────────── */}
      {!loading && !showSummary && currentCard && answered && (
        <Slide direction="up" in={answered} mountOnEnter unmountOnExit>
          <Box sx={{
            display: 'flex', gap: 1, px: 3, py: 2,
            borderTop: 1, borderColor: 'divider',
            bgcolor: 'background.paper',
          }}>
            {RATING_CONFIG.map(rc => (
              <Button
                key={rc.value}
                fullWidth
                disabled={submitting}
                onClick={() => handleRate(rc.value)}
                sx={{
                  py: 1.5, borderRadius: 2, fontWeight: 700,
                  bgcolor: rc.bg,
                  color: rc.color,
                  border: `1.5px solid ${alpha(rc.color, 0.3)}`,
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  '&:hover': {
                    bgcolor: alpha(rc.color, 0.18),
                    borderColor: rc.color,
                  },
                  '&:disabled': { opacity: 0.4 },
                }}
              >
                {rc.label}
                <Typography component="span" sx={{
                  ml: 0.8, fontSize: '0.7rem', opacity: 0.5, fontWeight: 500,
                }}>
                  {rc.key}
                </Typography>
              </Button>
            ))}
          </Box>
        </Slide>
      )}
    </Box>
  );
};