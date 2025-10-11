# 🎙️ Fastify Twilio OpenAI Voice Agent

A production-ready voice AI agent system built with Fastify, Twilio Media Streams, OpenAI Realtime API, ChromaDB vector database, and MongoDB. Features real-time conversational AI with semantic knowledge base search and comprehensive API documentation.

## ✨ Features

- 🎯 **Real-time Voice AI** - Sub-second latency voice conversations using OpenAI Realtime API
- 📞 **Twilio Integration** - PSTN connectivity with WebSocket media streaming
- 🧠 **Semantic Search** - ChromaDB vector database for intelligent knowledge retrieval
- 💾 **MongoDB Storage** - Persistent storage for call logs, sessions, and analytics
- 📚 **Swagger/OpenAPI** - Complete API documentation at `/docs`
- 📊 **Metrics & Observability** - Built-in performance tracking and health checks

## 🏗️ Architecture

```
┌─────────────┐
│  PSTN Call  │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│   Twilio Media       │
│   Streams (mulaw)    │
└──────┬───────────────┘
       │
       ▼
┌────────────────────────────────────┐
│   Fastify API Server               │
│   ├─ REST API (Swagger)            │
│   ├─ WebSocket Handler             │
│   ├─ Audio Conversion              │
│   └─ Session Management            │
└──────┬─────────────────────────────┘
       │
       ├──▶ OpenAI Realtime API (PCM16)
       ├──▶ ChromaDB (Vector Search)
       └──▶ MongoDB (Persistent Data)
```

## 📦 Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | Node.js + TypeScript | Type-safe server-side JavaScript |
| **Framework** | Fastify 4.x | Fast, low-overhead web framework |
| **Voice** | Twilio Media Streams | PSTN connectivity & audio streaming |
| **AI** | OpenAI Realtime API | Speech-to-text, LLM, text-to-speech |
| **Vector DB** | ChromaDB | Semantic knowledge base search |
| **Database** | MongoDB | Persistent data storage |
| **Docs** | Swagger/OpenAPI 3.0 | Interactive API documentation |
| **Logger** | Pino | Fast structured logging |
| **Process Mgr** | PM2 | Clustering & monitoring |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (with ES modules support)
- MongoDB (local or Atlas)
- Twilio account with phone number
- OpenAI API key

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/rkgudboy/fastify-twilio-openai-voice-agent.git
cd fastify-twilio-openai-voice-agent

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 2. Configuration

Edit `.env` with your credentials:

```env
# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI
OPENAI_API_KEY=sk-your-key-here

# MongoDB
MONGODB_URI=mongodb://localhost:27017/voice-ai-agent
```

### 3. Seed Knowledge Base

```bash
npm run seed
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### 5. View API Documentation

Open your browser to:
- **Swagger UI**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/api/health
- **Metrics**: http://localhost:3000/api/metrics

## 📖 API Endpoints

### Health & Monitoring

- `GET /api/health` - Health check with system stats
- `GET /api/ready` - Readiness probe for load balancers
- `GET /api/metrics` - Performance metrics and analytics

### Knowledge Base

- `GET /api/knowledge` - List all knowledge documents
- `POST /api/knowledge/search` - Semantic search
- `POST /api/knowledge/index` - Index new documents
- `GET /api/knowledge/stats` - Knowledge base statistics
- `DELETE /api/knowledge/:id` - Delete a document

### Voice (Twilio Webhooks)

- `POST /api/voice/incoming` - Incoming call webhook (returns TwiML)
- `POST /api/voice/status` - Call status updates
- `WS /api/voice/media-stream` - WebSocket for media streaming


### Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript to JavaScript
npm start            # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run seed         # Seed knowledge base
```

### Building for Production

```bash
# Build TypeScript
npm run build

# Start with PM2 (clustering)
pm2 start ecosystem.config.js

# Monitor
pm2 monit
pm2 logs voice-ai-agent

# Stop
pm2 stop voice-ai-agent
```

## 📝 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `3000` | Server port |
| `HOST` | No | `0.0.0.0` | Server host |
| `TWILIO_ACCOUNT_SID` | Yes | - | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Yes | - | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Yes | - | Twilio phone number |
| `OPENAI_API_KEY` | Yes | - | OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4o-realtime...` | OpenAI model |
| `MONGODB_URI` | No | `mongodb://localhost...` | MongoDB connection URI |
| `MONGODB_DB_NAME` | No | `voice-ai-agent` | MongoDB database name |
| `CHROMA_PATH` | No | `./chroma_data` | ChromaDB storage path |
| `LOG_LEVEL` | No | `info` | Logging level |
| `MAX_CONCURRENT_CALLS` | No | `100` | Max concurrent calls |

---