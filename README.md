# FireChat - Real-Time Chat Application

FireChat is a modern, real-time chat application built with React, Firebase Authentication, and PostgreSQL. It allows users to communicate instantly with each other in a sleek, responsive interface.

## Features

- **Real-time Messaging**: Instant message delivery using WebSocket technology
- **User Authentication**: Secure login with Firebase (email/password and Google OAuth)
- **Persistent Chat History**: All messages are stored in PostgreSQL database
- **Typing Indicators**: See when other users are typing in real-time
- **Read Receipts**: Track when messages have been read by recipients
- **Group Conversations**: Create chat rooms with multiple participants
- **User Status**: See which users are online or offline
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

### Frontend
- **React.js**: UI framework for building the user interface
- **TypeScript**: For type-safe code
- **Shadcn UI**: Component library for consistent, beautiful UI elements
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Wouter**: Lightweight routing library
- **React Query**: Data fetching and state management
- **React Hook Form**: Form validation and submission

### Backend
- **Express.js**: Web server framework
- **PostgreSQL**: Relational database for storing all application data
- **Drizzle ORM**: Type-safe database query builder
- **WebSockets**: For real-time communication
- **Firebase Authentication**: User authentication and management

## Project Structure

```
├── client/                  # Frontend React application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # Context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utility functions and services
│   │   ├── pages/           # Page components
│   │   └── types/           # TypeScript type definitions
├── server/                  # Backend Express application
│   ├── db.ts                # Database connection setup
│   ├── routes.ts            # API route definitions
│   ├── storage.ts           # Database storage operations
│   └── index.ts             # Server entry point
└── shared/                  # Shared code between frontend and backend
    └── schema.ts            # Database schema definitions
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Check server status |
| GET | `/api/users/:id` | Get a user by ID |
| GET | `/api/users/uid/:uid` | Get a user by Firebase UID |
| POST | `/api/users` | Create a new user |
| PATCH | `/api/users/:id/status` | Update a user's status |
| GET | `/api/users/:userId/conversations` | Get all conversations for a user |
| GET | `/api/conversations/:id` | Get a specific conversation |
| POST | `/api/conversations` | Create a new conversation |
| GET | `/api/conversations/:id/messages` | Get all messages in a conversation |
| POST | `/api/conversations/:id/messages` | Send a new message to a conversation |
| POST | `/api/messages/:id/read` | Mark a message as read |

## WebSocket API

The application uses WebSockets for real-time features:

- Connect to `/api/ws` to establish a WebSocket connection
- Message types:
  - `authenticate`: Connect a user to the WebSocket
  - `typing`: Indicate a user is typing in a conversation
  - `new_message`: Real-time message delivery

## Database Schema

### Users Table
- `id`: Primary key
- `uid`: Firebase user ID (unique)
- `username`: User's display name (unique)
- `email`: User's email address (unique)
- `photoURL`: User's profile picture URL
- `status`: Online/offline status
- `lastSeen`: Timestamp of last activity

### Conversations Table
- `id`: Primary key
- `name`: Conversation name (for group chats)
- `isGroup`: Whether the conversation is a group chat
- `createdAt`: Creation timestamp
- `lastMessageAt`: Last message timestamp

### Conversation Participants Table
- `id`: Primary key
- `conversationId`: Foreign key to conversations
- `userId`: Foreign key to users
- `unreadCount`: Number of unread messages

### Messages Table
- `id`: Primary key
- `conversationId`: Foreign key to conversations
- `senderId`: Foreign key to users
- `content`: Message content
- `contentType`: Type of content (text, image, etc.)
- `createdAt`: Timestamp
- `readBy`: Array of user IDs who have read the message

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Firebase project with Authentication enabled

### Environment Variables
Create a `.env` file with the following:

```
DATABASE_URL=postgresql://username:password@localhost:5432/firechat
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
```

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Push database schema: `npm run db:push`
4. Start development server: `npm run dev`

## Future Enhancements

- File and image sharing capabilities
- Message reactions and emoji support
- Voice and video calling features
- Message search functionality
- End-to-end encryption
- User profile customization
- Push notifications for new messages

## License

This project is licensed under the MIT License - see the LICENSE file for details.
