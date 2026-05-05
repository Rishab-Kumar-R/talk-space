# TalkSpace

A scalable, real-time chat application with end-to-end message encryption, file uploads, and horizontal scaling via Redis pub/sub.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                              │
│              (Browser — Next.js 16 / React 19)              │
└────────────────────────┬────────────────────────────────────┘
                         │  HTTP + WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Spring Boot (WebFlux)                     │
│                                                             │
│   REST API              WebSocket Handler     Security      │
│   /api/auth             /ws/chat/{room}       JWT Filter    │
│   /api/rooms            JWT via query param   BCrypt        │
│   /api/messages                               AES-256-GCM   │
│   /api/users                                                │
└──────────┬──────────────────────┬───────────────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────┐   ┌───────────────────────────────────────┐
│    MongoDB       │   │              Redis                    │
│                  │   │                                       │
│  messages        │   │  Pub/Sub: chat.room.{roomId}          │
│  users           │   │  Presence: presence.room.{roomId}     │
│  rooms           │   │                                       │
│  read receipts   │   │  Routes messages between server       │
│  ($text index)   │   │  instances for horizontal scaling     │
└──────────────────┘   └───────────────────────────────────────┘
                                  │
                         ┌────────┴────────┐
                         ▼                 ▼
                      AWS S3         (future instances)
                   (file uploads)
```

**Message flow:**
1. Client sends message over WebSocket
2. Server validates JWT, encrypts content (AES-256-GCM), saves to MongoDB
3. Server publishes to Redis channel `chat.room.{roomId}`
4. All server instances subscribed to that channel push the decrypted message to their connected clients
5. Recipients receive it in real time — even if on a different server instance

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Spring Boot 4, Spring WebFlux (reactive/non-blocking) |
| Database | MongoDB (persistence, full-text search) |
| Cache / Pub-Sub | Redis (inter-instance routing, presence tracking) |
| File Storage | AWS S3 (images, PDFs, documents) |
| Auth | JWT (jjwt 0.12), BCrypt |
| Encryption | AES-256-GCM (messages encrypted at rest) |
| Build | Gradle (Kotlin DSL), Bun |
| Monorepo | Turborepo |

## Features

- **Real-time messaging** — WebSocket + Redis pub/sub for multi-instance routing
- **Public & private rooms** — admin-controlled membership, invite/kick
- **Direct messages** — 1-on-1 private conversations
- **File uploads** — images, PDFs, documents via AWS S3
- **Message encryption** — AES-256-GCM at rest
- **Typing indicators** — live "X is typing..." with smart multi-user display
- **Emoji reactions** — with optimistic UI updates
- **Reply/thread** — reply to any message with a quoted preview
- **Edit & delete** — with live broadcast to all room members
- **Message search** — full-text search via MongoDB `$text` index
- **Pinned messages** — up to 5 per room, with overflow management
- **Read receipts** — per-message seen-by list (opt-in per user)
- **Unread counts** — per-room badge counters
- **User profiles** — display name, avatar color, status (available/away/DND), status text
- **Presence tracking** — real-time online user list per room
- **Infinite scroll** — cursor-based pagination for message history
- **WebSocket reconnect** — exponential backoff (1s → 30s max)
- **Desktop notifications** — browser push when tab is not focused
- **Markdown rendering** — bold, italic, code, code blocks, lists
- **Mobile responsive** — full-screen sidebar/chat toggle on small screens

## Project Structure

```
talk-space/
├── apps/
│   ├── server/                          # Spring Boot backend
│   │   └── src/main/java/dev/rishabkumar/talk_space/
│   │       ├── features/
│   │       │   ├── auth/                # JWT auth, register/login
│   │       │   ├── messaging/           # Messages, reactions, edit/delete, broadcast
│   │       │   ├── presence/            # Online user tracking (Redis sets)
│   │       │   ├── readreceipt/         # Read receipt tracking
│   │       │   ├── room/                # Rooms, membership, pinning
│   │       │   ├── upload/              # S3 file upload
│   │       │   ├── user/                # User profiles, search
│   │       │   └── websocket/           # WebSocket handler
│   │       └── shared/
│   │           ├── config/              # Redis config
│   │           └── security/            # JWT, BCrypt, Security filter chain
│   └── web/                             # Next.js frontend
│       ├── app/
│       │   ├── chat/page.tsx            # Thin composition shell
│       │   ├── login/page.tsx           # Auth page
│       │   └── middleware.ts            # Auth redirect
│       ├── features/
│       │   ├── auth/                    # Login/register API + useAuth hook
│       │   ├── messaging/               # Messages, reactions, WS hook, components
│       │   ├── notifications/           # Browser push notifications
│       │   ├── pinning/                 # Pin/unpin messages
│       │   ├── presence/                # Online user polling
│       │   ├── read-receipts/           # Mark read, fetch receipts
│       │   ├── rooms/                   # Room list, members, DMs
│       │   ├── search/                  # Full-text message search
│       │   ├── upload/                  # S3 file upload hook
│       │   └── users/                   # Profile, avatar, DM search
│       └── shared/
│           ├── types.ts                 # All shared TypeScript interfaces
│           └── lib/
│               ├── api-client.ts        # Base URL + auth headers
│               ├── utils.ts             # Helpers (avatarBg, formatTime, isDM, …)
│               └── markdown.tsx         # Marked + DOMPurify renderer
└── packages/                            # Shared Turborepo packages
```

## Prerequisites

- Java 21+
- Bun
- MongoDB 7+
- Redis 7+
- AWS account with an S3 bucket (for file uploads)

## Running Locally

### 1. Clone the repo

```bash
git clone https://github.com/Rishab-Kumar-R/talk-space.git
cd talk-space
```

### 2. Configure the backend

```bash
cp apps/server/.env.example apps/server/.env
```

Fill in `apps/server/.env`:

```env
JWT_SECRET=<openssl rand -base64 32>
ENCRYPTION_KEY=<openssl rand -base64 32>

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your key>
AWS_SECRET_ACCESS_KEY=<your secret>
AWS_S3_BUCKET=<your bucket>
```

### 3. Start infrastructure (MongoDB + Redis)

```bash
docker compose -f docker-compose.infra.yml up -d
```

### 4. Start the backend

```bash
cd apps/server
./gradlew bootRun
```

Server starts on `http://localhost:8080`.

### 5. Start the frontend

```bash
bun install      # from monorepo root
cd apps/web
bun dev
```

Frontend starts on `http://localhost:3000`.

## Running with Docker Compose (all services)

```bash
cp apps/server/.env.example apps/server/.env
# fill in the .env values

docker compose up --build
```

This starts MongoDB, Redis, the Spring Boot server, and the Next.js frontend together.

## Environment Variables

### Backend (`apps/server/.env`)

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | Base64 secret for signing JWTs |
| `ENCRYPTION_KEY` | Yes | Base64 key for AES-256-GCM message encryption |
| `AWS_REGION` | Yes | S3 bucket region |
| `AWS_ACCESS_KEY_ID` | Yes | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS secret key |
| `AWS_S3_BUCKET` | Yes | S3 bucket name |
| `SERVER_PORT` | No | Defaults to `8080` |
| `MONGODB_HOST` | No | Defaults to `localhost` |
| `REDIS_HOST` | No | Defaults to `localhost` |
| `ALLOWED_ORIGIN` | No | CORS origin, defaults to `http://localhost:3000` |

### Frontend

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Backend base URL (no trailing slash) |

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/rooms` | Yes | List accessible rooms |
| POST | `/api/rooms` | Yes | Create a room |
| GET | `/api/rooms/{id}/messages` | Yes | Paginated message history |
| GET | `/api/rooms/{id}/messages/search?q=` | Yes | Full-text search |
| GET | `/api/rooms/{id}/presence` | Yes | Online users in room |
| GET | `/api/rooms/{id}/members` | Yes | Member list with roles |
| POST | `/api/rooms/{id}/invite/{username}` | Yes | Invite a member (admin) |
| DELETE | `/api/rooms/{id}/members/{username}` | Yes | Remove a member (admin) |
| POST | `/api/rooms/{id}/pin/{messageId}` | Yes | Pin a message |
| DELETE | `/api/rooms/{id}/pin/{messageId}` | Yes | Unpin a message |
| GET | `/api/rooms/{id}/pinned` | Yes | List pinned messages |
| POST | `/api/messages/{id}/reactions` | Yes | Toggle emoji reaction |
| PATCH | `/api/messages/{id}` | Yes | Edit a message |
| DELETE | `/api/messages/{id}` | Yes | Delete a message |
| POST | `/api/messages/{id}/read` | Yes | Mark message as read |
| GET | `/api/messages/{id}/receipts` | Yes | Get read receipts |
| GET | `/api/users/me` | Yes | Get own profile |
| PATCH | `/api/users/me` | Yes | Update profile |
| GET | `/api/users/search?q=` | Yes | Search users |
| POST | `/api/upload` | Yes | Upload a file to S3 |
| WS | `/ws/chat/{roomId}?token=` | JWT | WebSocket connection |

## WebSocket Protocol

**Client → Server:**
```json
{ "type": "message", "content": "hello", "replyToId": "...", "replyPreview": "..." }
{ "type": "message", "fileUrl": "...", "fileName": "...", "fileSize": 1234, "mimeType": "image/png", "messageType": "image" }
{ "type": "typing" }
```

**Server → Client:**
```json
{ "type": "message", "id": "...", "senderUsername": "...", "content": "...", "timestamp": "..." }
{ "type": "typing", "username": "..." }
{ "type": "message_edited", "id": "...", "content": "...", "editedAt": "..." }
{ "type": "message_deleted", "id": "..." }
```
