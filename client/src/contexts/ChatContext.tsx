import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getConversations, 
  getMessages, 
  sendMessage as sendMessageToFirestore,
  createConversation as createConversationInFirestore,
  getUserData,
  markMessageAsRead
} from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Conversation {
  id: string;
  participants: string[];
  isGroup: boolean;
  name: string | null;
  lastMessageAt: any;
  createdAt: any;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  contentType: string;
  createdAt: any;
  readBy: string[];
}

interface ConversationWithUsers extends Conversation {
  users: any[];
  unreadCount: number;
  lastMessage?: Message;
}

interface ChatContextProps {
  conversations: ConversationWithUsers[];
  activeConversation: ConversationWithUsers | null;
  messages: Message[];
  selectedUserId: string | null;
  isLoading: boolean;
  typingUsers: Record<string, boolean>;
  setActiveConversation: (conversation: ConversationWithUsers | null) => void;
  sendMessage: (content: string, contentType?: string) => Promise<void>;
  createConversation: (participantIds: string[], isGroup?: boolean, name?: string) => Promise<string>;
  setSelectedUserId: (userId: string | null) => void;
  setTypingStatus: (isTyping: boolean) => void;
}

const ChatContext = createContext<ChatContextProps>({
  conversations: [],
  activeConversation: null,
  messages: [],
  selectedUserId: null,
  isLoading: true,
  typingUsers: {},
  setActiveConversation: () => {},
  sendMessage: async () => {},
  createConversation: async () => "",
  setSelectedUserId: () => {},
  setTypingStatus: () => {},
});

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithUsers[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationWithUsers | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  // Fetch conversations when user is authenticated
  useEffect(() => {
    if (!currentUser) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = getConversations(currentUser.uid, async (fetchedConversations: Conversation[]) => {
      const enrichedConversations = await Promise.all(
        fetchedConversations.map(async (conversation) => {
          // Get user data for all participants
          const users = await Promise.all(
            conversation.participants
              .filter(id => id !== currentUser.uid)
              .map(async (userId) => {
                try {
                  const userData = await getUserData(userId);
                  return { id: userId, ...userData };
                } catch (error) {
                  console.error("Error fetching user data:", error);
                  return { id: userId, username: "Unknown User" };
                }
              })
          );

          // Count unread messages
          let unreadCount = 0;
          // Get last message
          let lastMessage;
          
          try {
            // This is simplified - in a real app we'd use a proper query for the last message
            // and unread count instead of loading all messages
            const messagesRef = await getMessages(conversation.id, (msgs: Message[]) => {
              if (msgs.length > 0) {
                const unreadMessages = msgs.filter(
                  msg => !msg.readBy.includes(currentUser.uid) && msg.senderId !== currentUser.uid
                );
                unreadCount = unreadMessages.length;
                lastMessage = msgs[msgs.length - 1];
              }
            });
            
            // Cleanup subscription after getting initial data
            messagesRef();
          } catch (error) {
            console.error("Error counting unread messages:", error);
          }

          return {
            ...conversation,
            users,
            unreadCount,
            lastMessage
          };
        })
      );

      setConversations(enrichedConversations);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }

    const unsubscribe = getMessages(activeConversation.id, (fetchedMessages: Message[]) => {
      setMessages(fetchedMessages);
      
      // Mark messages as read
      fetchedMessages.forEach(message => {
        if (currentUser && 
            message.senderId !== currentUser.uid && 
            !message.readBy.includes(currentUser.uid)) {
          markMessageAsRead(message.id, currentUser.uid);
        }
      });
    });

    return () => unsubscribe();
  }, [activeConversation, currentUser]);

  const sendMessage = async (content: string, contentType: string = "text") => {
    if (!currentUser || !activeConversation) return;
    
    try {
      await sendMessageToFirestore(
        activeConversation.id,
        currentUser.uid,
        content,
        contentType
      );
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  const createConversation = async (participantIds: string[], isGroup: boolean = false, name?: string) => {
    if (!currentUser) throw new Error("User not authenticated");
    
    // Make sure current user is included in participants
    if (!participantIds.includes(currentUser.uid)) {
      participantIds.push(currentUser.uid);
    }
    
    try {
      // Check if a direct conversation already exists
      if (!isGroup && participantIds.length === 2) {
        const existingConversation = conversations.find(c => 
          !c.isGroup && 
          c.participants.includes(participantIds[0]) && 
          c.participants.includes(participantIds[1])
        );
        
        if (existingConversation) {
          setActiveConversation(existingConversation);
          return existingConversation.id;
        }
      }
      
      const conversationId = await createConversationInFirestore(participantIds, isGroup, name);
      return conversationId;
    } catch (error) {
      console.error("Error creating conversation:", error);
      throw error;
    }
  };

  const setTypingStatus = (isTyping: boolean) => {
    if (!currentUser || !activeConversation) return;
    
    // In a real app, you'd update a typing status in Firestore
    // and listen for changes from other users
    console.log(`User ${currentUser.uid} is ${isTyping ? 'typing' : 'not typing'}`);
  };

  const value = {
    conversations,
    activeConversation,
    messages,
    selectedUserId,
    isLoading,
    typingUsers,
    setActiveConversation,
    sendMessage,
    createConversation,
    setSelectedUserId,
    setTypingStatus
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
