# TalkSpace

![CI](https://github.com/Rishab-Kumar-R/talk-space/actions/workflows/ci.yml/badge.svg)
![Docker](https://github.com/Rishab-Kumar-R/talk-space/actions/workflows/docker.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

A scalable, real-time chat application with end-to-end message encryption, OAuth login, message threads, @ mentions, file uploads, and horizontal scaling via Redis pub/sub.

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
│   /api/rooms            WS ticket auth        OAuth 2.0     │
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
1. Client calls `POST /api/auth/ws-ticket` to get a short-lived (30 s), single-use opaque ticket
2. Client opens WebSocket at `/ws/chat/{roomId}?ticket=<ticket>`
3. Server atomically consumes the ticket from Redis (`GETDEL`) to identify the user — the JWT never appears in the URL or server logs
4. Server encrypts the message content (AES-256-GCM), saves to MongoDB
5. Server publishes to Redis channel `chat.room.{roomId}`
6. All server instances subscribed to that channel push the decrypted message to their connected clients
7. Recipients receive it in real time — even if on a different server instance

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Spring Boot 4, Spring WebFlux (reactive/non-blocking) |
| Database | MongoDB (persistence, full-text search) |
| Cache / Pub-Sub | Redis (inter-instance routing, presence tracking) |
| File Storage | AWS S3 (images, PDFs, documents) |
| Auth | JWT (jjwt 0.12), BCrypt, OAuth 2.0 (Google + GitHub) |
| Encryption | AES-256-GCM (messages encrypted at rest) |
| Build | Gradle (Kotlin DSL), Bun |
| Monorepo | Turborepo |

## Features

### Messaging
- **Real-time messaging** — WebSocket + Redis pub/sub for multi-instance routing
- **Message threads** — right-side thread panel per message; replies broadcast as `thread_reply` type and never pollute the main channel
- **@ mentions** — `@username` autocomplete in the input, stored on the message, highlighted in rendered output; dedicated mentions feed via `/api/messages/mentions`
- **Emoji reactions** — with optimistic UI updates
- **Reply with quote** — inline reply with a quoted preview of the original message
- **Edit & delete** — live-broadcast to all room members via WebSocket
- **Message search** — full-text search via MongoDB `$text` index
- **Pinned messages** — up to 5 per room, with overflow management
- **Read receipts** — per-message seen-by list (opt-in per user)
- **Typing indicators** — live "X is typing..." with smart multi-user display
- **Markdown rendering** — bold, italic, code blocks, lists, links

### Rooms & Users
- **Public & private rooms** — admin-controlled membership, invite/kick
- **Public room discovery** — `/browse` page (no login required) showing online count + last message preview
- **Direct messages** — 1-on-1 private conversations
- **User profiles** — display name, avatar color, status (available/away/DND), status text
- **Presence tracking** — real-time online user list per room
- **Unread counts** — per-room badge counters

### Auth & Security
- **OAuth login** — Google and GitHub ("Continue with…" on the login page)
- **Refresh token rotation** — 1 h access tokens + 30-day HttpOnly `SameSite=Strict` refresh cookie; silent renewal on 401
- **Message encryption** — AES-256-GCM at rest
- **Rate limiting** — per-user Redis fixed-window counters: 30 WS messages/min, 10 room joins/min, 20 uploads/day, 2 private/5 public rooms per month
- **WebSocket ticket auth** — JWT never appears in WS URL; a 30 s single-use Redis ticket is issued via REST and consumed atomically on connect

### Infrastructure & UX
- **Horizontal scaling** — Redis pub/sub routes messages across any number of server instances
- **File uploads** — images, PDFs, documents via AWS S3
- **Infinite scroll** — cursor-based pagination for message history
- **WebSocket reconnect** — exponential backoff (1 s → 30 s max)
- **Desktop notifications** — browser push when tab is not focused
- **Mobile responsive** — full-screen sidebar/chat toggle on small screens

## Project Structure

```
talk-space/
├── apps/
│   ├── server/                          # Spring Boot backend
│   │   └── src/main/java/dev/rishabkumar/talk_space/
│   │       ├── features/
│   │       │   ├── auth/                # JWT auth, OAuth, refresh token rotation
│   │       │   ├── messaging/           # Messages, reactions, threads, mentions, broadcast
│   │       │   ├── presence/            # Online user tracking (Redis sets)
│   │       │   ├── readreceipt/         # Read receipt tracking
│   │       │   ├── room/                # Rooms, membership, pinning, public discovery
│   │       │   ├── upload/              # S3 file upload
│   │       │   ├── user/                # User profiles, search
│   │       │   └── websocket/           # WebSocket handler (rate limiting, threads)
│   │       └── shared/
│   │           ├── config/              # Redis config
│   │           ├── metrics/             # Micrometer custom metrics
│   │           ├── ratelimit/           # Redis fixed-window rate limiter
│   │           └── security/            # JWT, BCrypt, Security filter chain
│   └── web/                             # Next.js frontend
│       ├── app/
│       │   ├── browse/page.tsx          # Public room discovery (no auth required)
│       │   ├── chat/page.tsx            # Thin composition shell
│       │   ├── login/page.tsx           # Auth page (password + OAuth)
│       │   └── middleware.ts            # Auth redirect
│       ├── features/
│       │   ├── auth/                    # Login/register API + useAuth hook
│       │   ├── messaging/               # Messages, reactions, threads, WS hook, components
│       │   │   ├── components/          # MessageItem, MessageInput, ThreadPanel, FileMessage
│       │   │   └── hooks/               # useWebSocket, useMessages, useThread, useTyping
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
│               ├── api-client.ts        # Base fetch wrapper with silent token refresh
│               ├── utils.ts             # Helpers (avatarBg, formatTime, isDM, …)
│               └── markdown.tsx         # Marked + DOMPurify (mention highlight)
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

# Optional — OAuth login (omit to disable those buttons)
GOOGLE_CLIENT_ID=<your google client id>
GOOGLE_CLIENT_SECRET=<your google client secret>
GITHUB_CLIENT_ID=<your github client id>
GITHUB_CLIENT_SECRET=<your github client secret>
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
| `GOOGLE_CLIENT_ID` | No | Google OAuth app client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth app client secret |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth app client secret |
| `JWT_EXPIRATION` | No | Access token TTL in ms, defaults to `3600000` (1 h) |
| `JWT_REFRESH_EXPIRATION` | No | Refresh token TTL in ms, defaults to `2592000000` (30 days) |
| `SERVER_PORT` | No | Defaults to `8080` |
| `MONGODB_HOST` | No | Defaults to `localhost` |
| `REDIS_HOST` | No | Defaults to `localhost` |
| `ALLOWED_ORIGIN` | No | CORS origin, defaults to `http://localhost:3000` |
| `AUDIT_ADMIN_USERS` | No | Comma-separated usernames that can access `GET /api/audit` (all events) |
| `CHAT_MAX_MESSAGE_LENGTH` | No | Max message length in characters, defaults to `4000` |

### Frontend

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Backend base URL (no trailing slash) |

## CI / CD

Two GitHub Actions workflows run on every push.

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | Every push, PRs to `main` | Compiles the Spring Boot backend, runs tests, then type-checks + lints + builds the Next.js frontend |
| `docker.yml` | Push to `main` | Builds multi-platform Docker images for server + web and pushes them to Docker Hub |

The Docker workflow requires two repository secrets (Settings → Secrets → Actions):

| Secret | Value |
|---|---|
| `DOCKERHUB_USERNAME` | your Docker Hub username |
| `DOCKERHUB_TOKEN` | a Docker Hub personal access token |

Images are tagged `latest` and with the short commit SHA:

```
<your-dockerhub-username>/talkspace-server:latest
<your-dockerhub-username>/talkspace-web:latest
```

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Login, returns JWT |
| POST | `/api/auth/refresh` | Cookie | Rotate refresh token, returns new JWT |
| POST | `/api/auth/logout` | Cookie | Revoke refresh token + clear cookie |
| POST | `/api/auth/ws-ticket` | Yes | Issue a 30 s single-use WebSocket ticket |
| GET | `/api/rooms` | Yes | List accessible rooms |
| GET | `/api/rooms/public` | No | List public rooms (for /browse page) |
| POST | `/api/rooms` | Yes | Create a room |
| GET | `/api/rooms/{id}/messages` | Yes | Paginated message history |
| GET | `/api/rooms/{id}/messages/search?q=` | Yes | Full-text search |
| GET | `/api/rooms/{id}/messages/{msgId}/thread` | Yes | All replies in a thread |
| GET | `/api/rooms/{id}/presence` | Yes | Online users in room |
| GET | `/api/rooms/{id}/members` | Yes | Member list with roles |
| POST | `/api/rooms/{id}/invite/{username}` | Yes | Invite a member (admin) |
| DELETE | `/api/rooms/{id}/members/{username}` | Yes | Remove a member (admin) |
| POST | `/api/rooms/{id}/pin/{messageId}` | Yes | Pin a message |
| DELETE | `/api/rooms/{id}/pin/{messageId}` | Yes | Unpin a message |
| GET | `/api/rooms/{id}/pinned` | Yes | List pinned messages |
| GET | `/api/messages/mentions` | Yes | Messages where the caller is @mentioned |
| POST | `/api/messages/{id}/reactions` | Yes | Toggle emoji reaction |
| PATCH | `/api/messages/{id}` | Yes | Edit a message |
| DELETE | `/api/messages/{id}` | Yes | Delete a message |
| POST | `/api/messages/{id}/read` | Yes | Mark message as read |
| GET | `/api/messages/{id}/receipts` | Yes | Get read receipts |
| GET | `/api/users/me` | Yes | Get own profile |
| PATCH | `/api/users/me` | Yes | Update profile |
| GET | `/api/users/search?q=` | Yes | Search users |
| POST | `/api/upload` | Yes | Upload a file to S3 |
| WS | `/ws/chat/{roomId}?ticket=` | WS ticket | WebSocket connection (ticket from `/api/auth/ws-ticket`) |

## WebSocket Protocol

**Client → Server:**
```json
{ "type": "message", "content": "hello" }
{ "type": "message", "content": "hello", "replyToId": "...", "replyPreview": "..." }
{ "type": "message", "content": "reply text", "threadId": "<rootMessageId>" }
{ "type": "message", "fileUrl": "...", "fileName": "...", "fileSize": 1234, "mimeType": "image/png", "messageType": "image" }
{ "type": "typing" }
```

**Server → Client:**
```json
{ "type": "message",              "id": "...", "senderUsername": "...", "content": "...", "timestamp": "...", "mentions": ["alice"] }
{ "type": "thread_reply",         "id": "...", "threadId": "...", "senderUsername": "...", "content": "...", "timestamp": "..." }
{ "type": "thread_count_updated", "rootId": "..." }
{ "type": "typing",               "username": "..." }
{ "type": "message_edited",       "id": "...", "content": "...", "editedAt": "..." }
{ "type": "message_deleted",       "id": "..." }
{ "type": "rate_limited",          "retryAfter": 60 }
```
