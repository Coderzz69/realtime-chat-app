import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer } from "ws";
import { 
  insertUserSchema, 
  insertConversationSchema, 
  insertParticipantSchema, 
  insertMessageSchema 
} from "@shared/schema";
import { z } from "zod";

// Type for WS messages
interface WebSocketMessage {
  type: string;
  payload: any;
}

// Helper to handle validation errors
function handleValidationError(err: any, res: Response) {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ 
      error: 'Validation error', 
      details: err.errors 
    });
  }
  console.error("API error:", err);
  return res.status(500).json({ error: 'Server error' });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Create WebSocket server on a different path to avoid conflict with Vite
  const wss = new WebSocketServer({ 
    noServer: true,
    path: '/api/ws'
  });
  
  // Store active connections
  const clients = new Map();
  
  // Handle WebSocket upgrade
  httpServer.on('upgrade', (request, socket, head) => {
    if (request.url?.startsWith('/api/ws')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });
  
  // WebSocket connection handling
  wss.on('connection', (ws) => {
    let userId: string | null = null;
    
    ws.on('message', async (message) => {
      try {
        const data: WebSocketMessage = JSON.parse(message.toString());
        console.log('WebSocket message received:', data.type);
        
        switch(data.type) {
          case 'authenticate':
            userId = data.payload.userId;
            if (userId) {
              clients.set(userId, ws);
              console.log(`User ${userId} connected via WebSocket`);
              // Send acknowledgment back to client
              ws.send(JSON.stringify({ 
                type: 'authenticated', 
                payload: { userId, success: true } 
              }));
            }
            break;
            
          case 'typing':
            if (userId && data.payload.conversationId) {
              // Broadcast typing status to all participants in the conversation
              const participants = await storage.getParticipantsForConversation(data.payload.conversationId);
              participants.forEach(p => {
                const participantWs = clients.get(p.userId.toString());
                if (participantWs && p.userId.toString() !== userId) {
                  participantWs.send(JSON.stringify({
                    type: 'user_typing',
                    payload: {
                      userId,
                      conversationId: data.payload.conversationId,
                      isTyping: data.payload.isTyping
                    }
                  }));
                }
              });
            }
            break;
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });
    
    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
        console.log(`User ${userId} disconnected from WebSocket`);
      }
    });
  });

  // API route for checking server status
  app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
  });
  
  // USER ROUTES
  
  // Get user by ID
  app.get('/api/users/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      return res.json(user);
    } catch (err) {
      return handleValidationError(err, res);
    }
  });
  
  // Get user by Firebase UID
  app.get('/api/users/uid/:uid', async (req, res) => {
    try {
      const { uid } = req.params;
      const user = await storage.getUserByUid(uid);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      return res.json(user);
    } catch (err) {
      return handleValidationError(err, res);
    }
  });
  
  // Create a new user
  app.post('/api/users', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      return res.status(201).json(user);
    } catch (err) {
      return handleValidationError(err, res);
    }
  });
  
  // Update user status
  app.patch('/api/users/:id/status', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || typeof status !== 'string') {
        return res.status(400).json({ error: 'Status is required' });
      }
      
      const user = await storage.updateUserStatus(id, status);
      return res.json(user);
    } catch (err) {
      return handleValidationError(err, res);
    }
  });
  
  // CONVERSATION ROUTES
  
  // Get all conversations for a user
  app.get('/api/users/:userId/conversations', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const conversations = await storage.getConversationsForUser(userId);
      
      // For each conversation, get participants
      const conversationsWithParticipants = await Promise.all(
        conversations.map(async (conversation) => {
          const participants = await storage.getParticipantsForConversation(conversation.id);
          
          // Get user details for each participant
          const participantDetails = await Promise.all(
            participants.map(async (p) => {
              const user = await storage.getUser(p.userId);
              return {
                ...p,
                user
              };
            })
          );
          
          return {
            ...conversation,
            participants: participantDetails
          };
        })
      );
      
      return res.json(conversationsWithParticipants);
    } catch (err) {
      return handleValidationError(err, res);
    }
  });
  
  // Get a specific conversation
  app.get('/api/conversations/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await storage.getConversation(id);
      
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      // Get participants
      const participants = await storage.getParticipantsForConversation(id);
      
      // Get user details for each participant
      const participantDetails = await Promise.all(
        participants.map(async (p) => {
          const user = await storage.getUser(p.userId);
          return {
            ...p,
            user
          };
        })
      );
      
      return res.json({
        ...conversation,
        participants: participantDetails
      });
    } catch (err) {
      return handleValidationError(err, res);
    }
  });
  
  // Create a new conversation
  app.post('/api/conversations', async (req, res) => {
    try {
      const conversationData = insertConversationSchema.parse(req.body);
      const participantIds = req.body.participantIds;
      
      if (!Array.isArray(participantIds) || participantIds.length < 2) {
        return res.status(400).json({ error: 'At least two participants are required' });
      }
      
      // Create the conversation
      const conversation = await storage.createConversation(conversationData);
      
      // Add participants
      await Promise.all(
        participantIds.map(userId => 
          storage.addParticipantToConversation({
            conversationId: conversation.id,
            userId: parseInt(userId)
          })
        )
      );
      
      // Get participants with user details
      const participants = await storage.getParticipantsForConversation(conversation.id);
      const participantDetails = await Promise.all(
        participants.map(async (p) => {
          const user = await storage.getUser(p.userId);
          return {
            ...p,
            user
          };
        })
      );
      
      return res.status(201).json({
        ...conversation,
        participants: participantDetails
      });
    } catch (err) {
      return handleValidationError(err, res);
    }
  });
  
  // MESSAGE ROUTES
  
  // Get messages for a conversation
  app.get('/api/conversations/:id/messages', async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getMessagesForConversation(conversationId);
      
      // Get sender details for each message
      const messagesWithSender = await Promise.all(
        messages.map(async (message) => {
          const sender = await storage.getUser(message.senderId);
          return {
            ...message,
            sender
          };
        })
      );
      
      return res.json(messagesWithSender);
    } catch (err) {
      return handleValidationError(err, res);
    }
  });
  
  // Create a new message
  app.post('/api/conversations/:id/messages', async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messageData = insertMessageSchema.parse({
        ...req.body,
        conversationId
      });
      
      // Create the message
      const message = await storage.createMessage(messageData);
      
      // Get sender details
      const sender = await storage.getUser(message.senderId);
      
      // Notify all participants via WebSocket
      const participants = await storage.getParticipantsForConversation(conversationId);
      participants.forEach(p => {
        const participantWs = clients.get(p.userId.toString());
        if (participantWs) {
          participantWs.send(JSON.stringify({
            type: 'new_message',
            payload: {
              ...message,
              sender
            }
          }));
        }
      });
      
      return res.status(201).json({
        ...message,
        sender
      });
    } catch (err) {
      return handleValidationError(err, res);
    }
  });
  
  // Mark a message as read
  app.post('/api/messages/:id/read', async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      await storage.markMessageAsRead(messageId, parseInt(userId));
      return res.json({ success: true });
    } catch (err) {
      return handleValidationError(err, res);
    }
  });

  // Return the HTTP server
  return httpServer;
}
