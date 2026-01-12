import { useState } from 'react';
import { Box, Stack, TextField, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import EmojiPicker, {type EmojiClickData } from 'emoji-picker-react';

interface MessageInputProps {
  onSend: (text: string) => void;
}

export const MessageInput = ({ onSend }: MessageInputProps) => {
  const [text, setText] = useState('');
  const [showPicker, setShowPicker] = useState(false);

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
    <Box sx={{ p: 2, bgcolor: '#ffffff', position: 'relative' }}>
      {showPicker && (
        <Box sx={{ position: 'absolute', bottom: 80, right: 20, zIndex: 10 }}>
          <EmojiPicker onEmojiClick={onEmojiClick} />
        </Box>
      )}
      <Stack direction="row" spacing={1} alignItems="flex-end">
        <IconButton sx={{ mb: 0.5 }}><AttachFileIcon /></IconButton>
        <TextField
          fullWidth multiline maxRows={4} placeholder="Write a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          variant="standard"
          slotProps={{input : { disableUnderline: true }}}
          sx={{ bgcolor: '#f4f4f5', borderRadius: 4, px: 2, py: 1.5 }}
        />
        <IconButton onClick={() => setShowPicker(!showPicker)} sx={{ mb: 0.5 }} color="primary">
          <InsertEmoticonIcon />
        </IconButton>
        <IconButton onClick={handleSend} color="primary" sx={{ mb: 0.5, bgcolor: '#3390ec', color: 'white', '&:hover': { bgcolor: '#297bcc'} }}>
          <SendIcon />
        </IconButton>
      </Stack>
    </Box>
  );
};

export default MessageInput;