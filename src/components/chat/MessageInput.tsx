import { useState } from 'react';
import { Box, Stack, TextField, IconButton, useTheme } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import EmojiPicker, { type EmojiClickData, Theme as EmojiTheme } from 'emoji-picker-react';

interface MessageInputProps {
  onSend: (text: string) => void;
}

export const MessageInput = ({ onSend }: MessageInputProps) => {
  const [text, setText] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const theme = useTheme(); // Access theme for Dark Mode logic

  const handleSend = () => {
    if (text.trim()) {
      onSend(text);
      setText('');
      setShowPicker(false);
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setText((prev) => prev + emojiData.emoji);
  };

  return (
    <Box sx={{
      p: 2,
      bgcolor: 'background.paper', // Dynamic: White vs Dark Grey
      borderTop: 1,
      borderColor: 'divider', // Dynamic: Slate-200 vs Slate-700
      position: 'relative'
    }}>
      {showPicker && (
        <Box sx={{ position: 'absolute', bottom: 80, right: 20, zIndex: 10 }}>
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            theme={theme.palette.mode === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT}
          />
        </Box>
      )}

      <Stack direction="row" spacing={1} alignItems="flex-end">
        <IconButton sx={{ mb: 0.5, color: 'action.active' }}>
            <AttachFileIcon />
        </IconButton>

        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Write a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          variant="standard"
          slotProps={{ input: { disableUnderline: true } }}
          sx={{
            bgcolor: 'action.hover', // Dynamic: Light Grey in Light, Darker Grey in Dark
            borderRadius: 4,
            px: 2,
            py: 1.5,
            '& .MuiInputBase-root': {
                color: 'text.primary',
            }
          }}
        />

        <IconButton
            onClick={() => setShowPicker(!showPicker)}
            sx={{
                mb: 0.5,
                color: showPicker ? 'primary.main' : 'action.active'
            }}
        >
          <InsertEmoticonIcon />
        </IconButton>

        <IconButton
            onClick={handleSend}
            disabled={!text.trim()}
            sx={{
                mb: 0.5,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
                '&.Mui-disabled': {
                    bgcolor: 'action.disabledBackground',
                    color: 'action.disabled'
                }
            }}
        >
          <SendIcon />
        </IconButton>
      </Stack>
    </Box>
  );
};

export default MessageInput;