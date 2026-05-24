export const stringToColor = (string: string) => {
  let hash = 0;
  for (let i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
};

export const getInitials = (name: string) =>
  (name ? name.slice(0, 2).toUpperCase() : '??');

export const getConversationName = (conv: any, currentUser: string) => {
    if (conv.type === 'group') return conv.name || 'Group Chat';
    else if (conv.type === 'system') return conv.name || 'System Conversation';
    const other = conv.participants.find((p: string) => p !== currentUser);
    return other || 'Unknown';
};