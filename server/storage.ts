import { 
  users, 
  conversations, 
  conversationParticipants, 
  messages,
  type User, 
  type InsertUser,
  type Conversation,
  type InsertConversation,
  type ConversationParticipant,
  type InsertParticipant,
  type Message,
  type InsertMessage
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByUid(uid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStatus(userId: number, status: string): Promise<User>;
  
  // Conversation methods
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationsForUser(userId: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  
  // Participant methods
  addParticipantToConversation(participant: InsertParticipant): Promise<ConversationParticipant>;
  getParticipantsForConversation(conversationId: number): Promise<ConversationParticipant[]>;
  updateUnreadCount(conversationId: number, userId: number, count: number): Promise<void>;
  
  // Message methods
  getMessagesForConversation(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(messageId: number, userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }
  
  async getUserByUid(uid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.uid, uid));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  async updateUserStatus(userId: number, status: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        status,
        lastSeen: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  // Conversation methods
  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conversation || undefined;
  }
  
  async getConversationsForUser(userId: number): Promise<Conversation[]> {
    // First get all conversation IDs this user is part of
    const participations = await db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));
    
    const conversationIds = participations.map(p => p.conversationId);
    
    if (conversationIds.length === 0) {
      return [];
    }
    
    // Then get all those conversations
    return await db
      .select()
      .from(conversations)
      .where(inArray(conversations.id, conversationIds))
      .orderBy(desc(conversations.lastMessageAt));
  }
  
  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values({
        ...insertConversation,
        createdAt: new Date(),
        lastMessageAt: new Date()
      })
      .returning();
    return conversation;
  }
  
  // Participant methods
  async addParticipantToConversation(participant: InsertParticipant): Promise<ConversationParticipant> {
    const [participation] = await db
      .insert(conversationParticipants)
      .values(participant)
      .returning();
    return participation;
  }
  
  async getParticipantsForConversation(conversationId: number): Promise<ConversationParticipant[]> {
    return await db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId));
  }
  
  async updateUnreadCount(conversationId: number, userId: number, count: number): Promise<void> {
    await db
      .update(conversationParticipants)
      .set({ unreadCount: count })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      );
  }
  
  // Message methods
  async getMessagesForConversation(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt));
  }
  
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    // Create the message with initial readBy array containing the sender
    const [message] = await db
      .insert(messages)
      .values({
        ...insertMessage,
        createdAt: new Date(),
        readBy: [insertMessage.senderId.toString()]
      })
      .returning();
    
    // Update the conversation's lastMessageAt
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, insertMessage.conversationId));
    
    // Increment unread count for all participants except the sender
    await db.execute(
      sql`UPDATE conversation_participants 
          SET unread_count = unread_count + 1 
          WHERE conversation_id = ${insertMessage.conversationId} 
          AND user_id != ${insertMessage.senderId}`
    );
    
    return message;
  }
  
  async markMessageAsRead(messageId: number, userId: number): Promise<void> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId));
    
    if (!message) {
      return;
    }
    
    // Add the user ID to the readBy array if it's not already there
    if (!message.readBy.includes(userId.toString())) {
      const newReadBy = [...message.readBy, userId.toString()];
      
      await db
        .update(messages)
        .set({ readBy: newReadBy })
        .where(eq(messages.id, messageId));
      
      // Reset unread count for this user in this conversation
      await db
        .update(conversationParticipants)
        .set({ unreadCount: 0 })
        .where(
          and(
            eq(conversationParticipants.conversationId, message.conversationId),
            eq(conversationParticipants.userId, userId)
          )
        );
    }
  }
}

export const storage = new DatabaseStorage();
