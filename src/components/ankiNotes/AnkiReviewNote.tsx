// components/AnkiReviewNote.tsx
import React, { useState } from 'react';
import { Box, Typography, Collapse, Chip, alpha } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { AnkiReview } from './types';

interface Props {
  review: AnkiReview;
  isMine: boolean;
}

export const AnkiReviewNote = ({ review, isMine }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasMatches = review.tickedNotes.length > 0;

  const colors = {
    success: {
      main: '#fbc02d',
      light: '#fffde7',
      text: '#5d4037',
      hover: '#fff9c4'    // New Solid Hover Color (Yellow)
    },
    fail: {
      main: '#ef5350',
      light: '#ffebee',
      text: '#c62828',
      hover: '#ffcdd2'    // New Solid Hover Color (Red)
    }
  };

  const activeColor = hasMatches ? colors.success : colors.fail;

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isMine ? 'flex-end' : 'flex-start',
        marginTop: '-6px',
        marginBottom: '12px',
        paddingX: 2,
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* --- MODIFY THIS BOX (The Main Container) --- */}
      <Box
        onClick={() => setIsOpen(!isOpen)}
        sx={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'flex-start',

          bgcolor: activeColor.light,
          border: `1px solid ${activeColor.main}`,

          borderRadius: 2,
          borderTopLeftRadius: isMine ? 2 : 0,
          borderTopRightRadius: isMine ? 0 : 2,

          maxWidth: isOpen ? '75%' : 'auto',
          minWidth: '100px',

          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',

          // --- THE FIX IS HERE ---
          '&:hover': {
            // We use the SOLID hover color defined above, NOT alpha()
            bgcolor: activeColor.hover,
            boxShadow: `0 2px 8px ${alpha(activeColor.main, 0.25)}`
          }
        }}
      >

        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: '6px 10px',
            gap: 1
          }}
        >
          {hasMatches ? (
            <CheckCircleOutlineIcon sx={{ fontSize: 16, color: activeColor.main }} />
          ) : (
            <ErrorOutlineIcon sx={{ fontSize: 16, color: activeColor.main }} />
          )}

          <Typography
            variant="caption"
            sx={{
              color: activeColor.text,
              fontWeight: 700,
              userSelect: 'none',
              lineHeight: 1
            }}
          >
            {hasMatches ? "Review Passed" : "No Matches"}
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          {isOpen ? (
            <KeyboardArrowUpIcon sx={{ fontSize: 16, color: activeColor.text, opacity: 0.6 }} />
          ) : (
            <KeyboardArrowDownIcon sx={{ fontSize: 16, color: activeColor.text, opacity: 0.6 }} />
          )}
        </Box>

        {/* Body */}
        <Collapse in={isOpen} timeout="auto" unmountOnExit sx={{ width: '100%' }}>
          <Box
            sx={{
              padding: '0 10px 10px 10px',
              borderTop: `1px dashed ${alpha(activeColor.main, 0.3)}`,
              marginTop: '2px',
              paddingTop: '8px'
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: activeColor.text,
                fontSize: '0.8rem',
                fontStyle: 'italic',
                marginBottom: 1.5,
                lineHeight: 1.4
              }}
            >
              "{review.messageReview}"
            </Typography>

            {hasMatches && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {review.tickedNotes.map((note) => (
                  <Chip
                    key={note.id}
                    label={note.word}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      backgroundColor: activeColor.main,
                      color: '#fff',
                      fontWeight: 600,
                      '& .MuiChip-label': { padding: '0 8px' }
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
};