export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

export interface Conversation {
  id: string;
  name?: string;
  isGroup: boolean;
  lastMessage?: {
    content: string;
    timestamp: Date;
    senderId: string;
  };
  participants: UserProfile[];
  unreadCount?: number;
}

export interface UserProfile {
  id: string;
  username?: string;
  displayName: string;
  photoURL: string;
  status: 'online' | 'offline';
  lastSeen?: Date;
  bio?: string;
}

export interface ChatState {
  currentConversation: Conversation | null;
  conversations: Conversation[];
  messages: Message[];
  isTyping: { [userId: string]: boolean };
  error: string | null;
  loading: boolean;
}

export interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}
