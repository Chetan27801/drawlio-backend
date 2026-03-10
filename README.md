# Drawlio Backend

Drawlio is a **real-time multiplayer drawing and guessing game** (similar to Skribbl.io / Pictionary). Players join rooms, take turns drawing a word on a shared canvas while other players guess the word via chat. It features a turn-based round system, real-time canvas synchronization, a scoring engine, hint reveals, and lobby management — all built with **WebSockets** for sub-second latency.

## Tech Stack

- **Runtime:** Node.js 20
- **Language:** TypeScript
- **Framework:** Express 5
- **WebSockets:** Socket.IO
- **Cache/Store:** Redis 7
- **Logging:** Winston
- **Security:** Helmet, CORS, Compression

## Project Structure

```
src/
├── config/        # App, Redis, and game configuration
├── constants/     # Event names, game rules, error messages
├── core/          # WebSocket server, connection handling, event routing
├── game/          # Game logic — rooms, players, turns, scoring, word bank
├── services/      # Redis client
├── tests/         # Game class and flow tests
├── types/         # TypeScript type definitions
├── utils/         # Logger, Timer, helpers, validators
├── app.ts         # Express application setup
└── server.ts      # Entry point — boots HTTP + WebSocket servers
```

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [Docker](https://www.docker.com/) & Docker Compose (for Redis and/or containerized runs)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd drawlio-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example env file and adjust values as needed:

```bash
cp .env.example .env
```

Key variables:

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `3000` | Server port |
| `HOST` | `localhost` | Server host |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin (frontend URL) |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `MAX_PLAYERS_PER_ROOM` | `4` | Max players allowed per room |
| `DEFAULT_ROUNDS` | `3` | Number of rounds per game |
| `DEFAULT_DRAW_TIME` | `60` | Seconds per drawing turn |
| `LOG_LEVEL` | `debug` | Winston log level |

### 4. Start Redis (via Docker Compose)

```bash
npm run docker:up
```

This starts a Redis 7 Alpine container on port `6379` with persistence enabled.

### 5. Run the dev server

```bash
npm run dev
```

The server starts at `http://localhost:3000` with hot-reload via Nodemon.

## Running with Docker

### Build the image

```bash
docker build -t drawlio-backend .
```

### Run the full stack (Redis + App)

**Step 1 — Start Redis:**

```bash
npm run docker:up
```

**Step 2 — Run the backend container:**

```bash
docker run --env-file .env.docker -p 3000:3000 drawlio-backend
```

> `.env.docker` uses `host.docker.internal` for Redis so the app container can reach the Redis container running on the host network.

### Stop everything

```bash
# Stop the app container (Ctrl+C or docker stop)
npm run docker:down    # stops Redis
npm run docker:clean   # stops Redis and removes volumes
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled production build |
| `npm run docker:up` | Start Redis container (detached) |
| `npm run docker:down` | Stop Redis container |
| `npm run docker:logs` | Tail Redis container logs |
| `npm run docker:clean` | Stop Redis and remove volumes |
| `npm run test:classes` | Run game class tests |
| `npm run test:flow` | Run game flow tests |

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /health` | Health check |
| `GET /api` | API info |

## CI/CD

The GitHub Actions workflow (`.github/workflows/CI_CD.yaml`) runs on pushes and PRs to `main`:

1. **Build & Test** — installs dependencies and compiles TypeScript
2. **Push & Deploy** (main only) — builds and pushes a Docker image to Docker Hub, then triggers a deploy to Render via webhook
