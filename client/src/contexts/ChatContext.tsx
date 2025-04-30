import { createContext, useContext, useEffect, useState, ReactNode, useReducer } from "react";
import { 
  db, 
  createConversation, 
  sendMessage, 
  getUserConversations, 
  getConversationMessages, 
  markMessageAsRead, 
  setTypingStatus, 
  getTypingUsers 
} from "../lib/firebase";
import { useAuth } from "./AuthContext";
import { ChatState, Conversation, Message, UserProfile } from "../types";

interface ChatContextType {
  state: ChatState;
  sendMessage: (content: string) => Promise<void>;
  createConversation: (participants: string[], name?: string, isGroup?: boolean) => Promise<string>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  markAsRead: (messageId: string) => Promise<void>;
  setTyping: (isTyping: boolean) => Promise<void>;
}

type ChatAction = 
  | { type: 'SET_CONVERSATIONS', payload: Conversation[] }
  | { type: 'SET_CURRENT_CONVERSATION', payload: Conversation | null }
  | { type: 'SET_MESSAGES', payload: Message[] }
  | { type: 'ADD_MESSAGE', payload: Message }
  | { type: 'SET_TYPING', payload: { [userId: string]: boolean } }
  | { type: 'SET_LOADING', payload: boolean }
  | { type: 'SET_ERROR', payload: string | null };

const initialState: ChatState = {
  currentConversation: null,
  conversations: [],
  messages: [],
  isTyping: {},
  loading: false,
  error: null
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };
    case 'SET_CURRENT_CONVERSATION':
      return { ...state, currentConversation: action.payload };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_TYPING':
      return { ...state, isTyping: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { user } = useAuth();

  // Fetch user conversations when authenticated
  useEffect(() => {
    let unsubscribe: () => void;
    
    if (user) {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      unsubscribe = getUserConversations(user.uid, (conversations) => {
        dispatch({ type: 'SET_CONVERSATIONS', payload: conversations });
        dispatch({ type: 'SET_LOADING', payload: false });
      });
    }
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  // Fetch messages when current conversation changes
  useEffect(() => {
    let unsubscribe: () => void;
    
    if (state.currentConversation && user) {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      unsubscribe = getConversationMessages(state.currentConversation.id, (messages) => {
        dispatch({ type: 'SET_MESSAGES', payload: messages });
        dispatch({ type: 'SET_LOADING', payload: false });
      });
      
      // Also set up typing status listener
      const typingUnsubscribe = getTypingUsers(state.currentConversation.id, (typingUsers) => {
        const typingMap: { [userId: string]: boolean } = {};
        
        typingUsers.forEach(userId => {
          if (userId !== user.uid) {
            typingMap[userId] = true;
          }
        });
        
        dispatch({ type: 'SET_TYPING', payload: typingMap });
      });
      
      return () => {
        unsubscribe();
        typingUnsubscribe();
      };
    }
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [state.currentConversation, user]);

  // Create a new conversation
  const createNewConversation = async (participants: string[], name?: string, isGroup: boolean = false) => {
    if (!user) throw new Error("You must be logged in");
    
    try {
      const conversationId = await createConversation(
        [user.uid, ...participants],
        name || null,
        isGroup
      );
      
      return conversationId;
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: (error as Error).message
      });
      throw error;
    }
  };

  // Send a message to the current conversation
  const sendNewMessage = async (content: string) => {
    if (!user || !state.currentConversation) {
      throw new Error("No active conversation");
    }
    
    try {
      await sendMessage(state.currentConversation.id, user.uid, content);
      
      // Reset typing status after sending a message
      await setTypingStatus(state.currentConversation.id, user.uid, false);
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: (error as Error).message
      });
      throw error;
    }
  };

  // Set current conversation
  const setCurrentConversation = (conversation: Conversation | null) => {
    dispatch({ type: 'SET_CURRENT_CONVERSATION', payload: conversation });
    
    // Reset messages when changing conversation
    if (conversation === null) {
      dispatch({ type: 'SET_MESSAGES', payload: [] });
    }
  };

  // Mark message as read
  const markAsRead = async (messageId: string) => {
    try {
      await markMessageAsRead(messageId);
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: (error as Error).message
      });
      throw error;
    }
  };

  // Set typing status
  const setTyping = async (isTyping: boolean) => {
    if (!user || !state.currentConversation) return;
    
    try {
      await setTypingStatus(state.currentConversation.id, user.uid, isTyping);
    } catch (error) {
      console.error("Error setting typing status:", error);
    }
  };

  const value = {
    state,
    sendMessage: sendNewMessage,
    createConversation: createNewConversation,
    setCurrentConversation,
    markAsRead,
    setTyping
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
