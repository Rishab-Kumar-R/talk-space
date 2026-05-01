# TalkSpace

A scalable, real-time chat application built with a reactive backend and a modern frontend. Designed for high concurrency with horizontal scaling via Redis pub/sub.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                              │
│              (Browser — Next.js 16 / React 19)              │
└────────────────────────┬────────────────────────────────────┘
                         │  HTTP + WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Spring Boot (WebFlux)                      │
│                                                             │
│   REST API              WebSocket Handler     Security      │
│   /api/auth             /ws/chat/{room}       JWT Filter    │
│   /api/rooms            JWT via query param   BCrypt        │
│   /api/messages                                             │
│   /api/users                                                │
└──────────┬──────────────────────┬──────────────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────┐   ┌──────────────────────────────────────┐
│    MongoDB       │   │              Redis                    │
│                  │   │                                       │
│  messages        │   │  Pub/Sub: chat.room.{roomId}          │
│  users           │   │  Presence: presence.room.{roomId}     │
│  rooms           │   │                                       │
│  ($text index    │   │  Routes messages between server       │
│   on content)    │   │  instances for horizontal scaling     │
└──────────────────┘   └──────────────────────────────────────┘
```

**Message flow:**
1. User A sends a message over WebSocket
2. Server validates JWT, saves to MongoDB
3. Server publishes to Redis channel `chat.room.{roomId}`
4. All server instances subscribed to that channel push the message to their connected clients
5. User B receives the message in real time — even if connected to a different server instance

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Spring Boot 4, Spring WebFlux (reactive/non-blocking) |
| Database | MongoDB (message persistence, full-text search) |
| Pub/Sub | Redis (inter-instance routing, presence tracking) |
| Auth | JWT (jjwt 0.12), BCrypt |
| Build | Gradle (Kotlin DSL), Bun |
| Monorepo | Turborepo |

## Features

- **Real-time messaging** — WebSocket with Redis pub/sub for multi-instance routing
- **Public rooms** — create and join named chat rooms
- **Direct messages** — 1-on-1 private conversations
- **Typing indicators** — live "X is typing..." with smart multi-user display
- **Message reactions** — emoji reactions with optimistic UI updates
- **Reply/thread** — reply to any message with a quoted preview
- **Message search** — full-text search via MongoDB `$text` index
- **Presence tracking** — real-time online user list per room
- **Infinite scroll** — cursor-based pagination for message history
- **WebSocket reconnect** — exponential backoff (1s → 2s → 4s → max 30s)
- **Mobile responsive** — full-screen room list / chat toggle on mobile

## Project Structure

```
scalable-chat-app/
├── apps/
│   ├── server/                        # Spring Boot backend
│   │   └── src/main/java/dev/rishabkumar/chat_app/
│   │       ├── config/                # Security, Redis, WebSocket config
│   │       ├── controller/            # REST endpoints
│   │       ├── handler/               # WebSocket handler
│   │       ├── model/                 # MongoDB documents
│   │       ├── repository/            # Reactive repositories
│   │       ├── service/               # JWT, Auth logic
│   │       └── dto/                   # Request/response DTOs
│   └── web/                           # Next.js frontend
│       └── app/
│           ├── chat/                  # Chat UI
│           ├── login/                 # Auth page
│           ├── lib/                   # API client, WebSocket hook
│           └── middleware.ts          # Auth redirect
└── packages/                          # Shared Turborepo packages
```

## Prerequisites

- Java 21
- Bun
- MongoDB (local or hosted)
- Redis (local or hosted)

## Running Locally

### 1. Clone the repo

```bash
git clone https://github.com/Rishab-Kumar-R/scalable-chat-app.git
cd scalable-chat-app
```

### 2. Configure the backend

Edit `apps/server/src/main/resources/application.yaml`:

```yaml
spring:
  mongodb:
    host: localhost
    port: 27017
    database: chat_db
  data:
    redis:
      host: localhost
      port: 6379
jwt:
  secret: "your-base64-encoded-secret"
  expiration: 86400000
```

### 3. Start the backend

```bash
cd apps/server
./gradlew bootRun
```

Server starts on `http://localhost:8080`.

### 4. Start the frontend

```bash
cd apps/web
bun install
bun dev
```

Frontend starts on `http://localhost:3000`.

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/rooms` | No | List all rooms |
| POST | `/api/rooms` | Yes | Create a room |
| GET | `/api/rooms/{roomId}/messages` | Yes | Get messages (cursor paginated) |
| GET | `/api/rooms/{roomId}/messages/search?q=` | Yes | Full-text search |
| GET | `/api/rooms/{roomId}/presence` | No | Get online users in room |
| POST | `/api/messages/{id}/reactions` | Yes | Toggle emoji reaction |
| GET | `/api/users/search?q=` | Yes | Search users (for DMs) |
| WS | `/ws/chat/{roomId}?token=` | JWT | WebSocket chat connection |

## WebSocket Event Protocol

All WebSocket messages are JSON with a `type` field.

**Client → Server:**
```json
{ "type": "message", "content": "hello", "replyToId": "...", "replyPreview": "..." }
{ "type": "typing" }
```

**Server → Client:**
```json
{ "type": "message", "id": "...", "senderUsername": "...", "content": "...", "timestamp": "..." }
{ "type": "typing", "username": "..." }
```
