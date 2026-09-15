export interface FrontendMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export function serializeMessage(message: any, currentUserId: string): FrontendMessage {
  const isMine = message.senderId === currentUserId;
  const date = new Date(message.createdAt);
  const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return {
    id: message.id,
    senderId: isMine ? 'me' : message.senderId,
    text: message.text,
    timestamp: formattedTime,
    read: message.read,
  };
}

export function serializeConversation(
  conversation: any,
  currentUserId: string,
  otherProfile: any
) {
  const messages = (conversation.messages || []).map((m: any) =>
    serializeMessage(m, currentUserId)
  );

  const matchedDate = new Date(conversation.createdAt || conversation.lastMessageAt);
  const matchedAt = matchedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  const unreadCount = (conversation.messages || []).filter(
    (m: any) => m.senderId !== currentUserId && !m.read
  ).length;

  return {
    id: conversation.id,
    profile: otherProfile,
    messages,
    matchedAt,
    isNew: unreadCount > 0,
    unreadCount,
  };
}
