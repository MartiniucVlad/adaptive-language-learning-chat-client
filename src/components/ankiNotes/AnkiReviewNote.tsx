// components/AnkiReviewNote.tsx
import React, { useState } from 'react';
import { Box, Paper, Typography, Collapse, Chip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SchoolIcon from '@mui/icons-material/School';
import { AnkiReview } from './types';

interface Props {
  review: AnkiReview;
  isMine: boolean;
}

export const AnkiReviewNote = ({ review, isMine }: Props) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isMine ? 'flex-end' : 'flex-start',
        mt: -1,
        mb: 2,
        position: 'relative',
        zIndex: 1,
        px: 2,
      }}
    >
      <Paper
        elevation={2}
        onClick={() => setExpanded(!expanded)}
        sx={{
          bgcolor: '#fff9c4',
          color: '#5d4037',
          // 1. Reduce padding for compact look
          p: expanded ? 1 : '4px 8px',
          borderRadius: 2,
          // 2. Auto width when minimized, max 65% when expanded
          width: expanded ? 'auto' : 'fit-content',
          maxWidth: '65%',
          cursor: 'pointer',
          border: '1px solid #fbc02d',
          borderTopLeftRadius: isMine ? 2 : 0,
          borderTopRightRadius: isMine ? 0 : 2,
          transition: 'all 0.2s ease-in-out', // Smooth transition for width change
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            // 3. Tight gap for minimized state
            gap: expanded ? 1 : 0.5,
            justifyContent: 'space-between', // Ensure arrow is pushed to the right
          }}
        >
          {/* 4. Hide Icon when minimized */}
          {expanded && <SchoolIcon sx={{ fontSize: 16, color: '#f57f17' }} />}

          <Typography variant="caption" fontWeight="bold" sx={{ whiteSpace: 'nowrap' }}>
            Review Note
            {/* 5. Hide card count when minimized */}
            {expanded && review.tickedNotes.length > 0 && ` • ${review.tickedNotes.length} Cards`}
          </Typography>

          {/* Spacer to push arrow to the right in expanded mode */}
          {expanded && <Box sx={{ flexGrow: 1 }} />}

          {/* Arrow Icon */}
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </Box>

        {/* Collapsible Content (Unchanged) */}
        <Collapse in={expanded}>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ fontSize: '0.85rem', fontStyle: 'italic', mb: 1 }}>
              "{review.messageReview}"
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {review.tickedNotes.map((note) => (
                <Chip
                  key={note.id}
                  label={note.word}
                  size="small"
                  sx={{
                    bgcolor: '#fbc02d',
                    color: 'white',
                    height: 20,
                    fontSize: '0.7rem'
                  }}
                />
              ))}
            </Box>
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
};