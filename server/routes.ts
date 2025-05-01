import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // API route for checking server status
  app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
  });

  // Return the HTTP server
  return httpServer;
}
