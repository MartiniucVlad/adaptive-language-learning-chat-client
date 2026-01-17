import React, { useState } from 'react';
import { Box, Typography, Collapse, Chip, alpha, useTheme } from '@mui/material';
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
  const theme = useTheme(); // Access theme for dynamic coloring
  const hasMatches = review.tickedNotes.length > 0;

  // Define colors dynamically based on the theme palette
  // We use alpha() so it works on both Light and Dark modes automatically
  const baseColor = hasMatches ? theme.palette.success.main : theme.palette.error.main;

  // Custom styles for the status container
  const containerStyle = {
      bgcolor: alpha(baseColor, theme.palette.mode === 'light' ? 0.1 : 0.15),
      borderColor: alpha(baseColor, 0.5),
      hoverBg: alpha(baseColor, theme.palette.mode === 'light' ? 0.2 : 0.25),
      textColor: theme.palette.mode === 'light'
        ? (hasMatches ? '#5d4037' : '#c62828') // Keep your original high contrast text for light mode
        : (hasMatches ? theme.palette.success.light : theme.palette.error.light) // Lighter text for dark mode
  };

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
      <Box
        onClick={() => setIsOpen(!isOpen)}
        sx={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'flex-start',

          bgcolor: containerStyle.bgcolor,
          border: '1px solid',
          borderColor: containerStyle.borderColor,

          borderRadius: 2,
          borderTopLeftRadius: isMine ? 2 : 0,
          borderTopRightRadius: isMine ? 0 : 2,

          maxWidth: isOpen ? '75%' : 'auto',
          minWidth: '100px',

          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',

          '&:hover': {
            bgcolor: containerStyle.hoverBg,
            boxShadow: `0 2px 8px ${alpha(baseColor, 0.25)}`
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
            <CheckCircleOutlineIcon sx={{ fontSize: 16, color: baseColor }} />
          ) : (
            <ErrorOutlineIcon sx={{ fontSize: 16, color: baseColor }} />
          )}

          <Typography
            variant="caption"
            sx={{
              color: containerStyle.textColor,
              fontWeight: 700,
              userSelect: 'none',
              lineHeight: 1
            }}
          >
            {hasMatches ? "Review Passed" : "No Matches"}
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          {isOpen ? (
            <KeyboardArrowUpIcon sx={{ fontSize: 16, color: containerStyle.textColor, opacity: 0.6 }} />
          ) : (
            <KeyboardArrowDownIcon sx={{ fontSize: 16, color: containerStyle.textColor, opacity: 0.6 }} />
          )}
        </Box>

        {/* Body */}
        <Collapse in={isOpen} timeout="auto" unmountOnExit sx={{ width: '100%' }}>
          <Box
            sx={{
              padding: '0 10px 10px 10px',
              borderTop: '1px dashed',
              borderColor: alpha(baseColor, 0.3),
              marginTop: '2px',
              paddingTop: '8px'
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: 'text.primary', // Use theme text color
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
                      backgroundColor: baseColor,
                      color: theme.palette.getContrastText(baseColor), // Dynamic text color (black/white)
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