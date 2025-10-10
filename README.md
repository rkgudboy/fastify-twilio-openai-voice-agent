# 🎙️ Fastify Twilio OpenAI Voice Agent

A production-ready voice AI agent system built with Fastify, Twilio Media Streams, OpenAI Realtime API, ChromaDB vector database, and MongoDB. Features real-time conversational AI with semantic knowledge base search and comprehensive API documentation.

## ✨ Features

- 🎯 **Real-time Voice AI** - Sub-second latency voice conversations using OpenAI Realtime API
- 📞 **Twilio Integration** - PSTN connectivity with WebSocket media streaming
- 🧠 **Semantic Search** - ChromaDB vector database for intelligent knowledge retrieval
- 💾 **MongoDB Storage** - Persistent storage for call logs, sessions, and analytics
- 📚 **Swagger/OpenAPI** - Complete API documentation at `/docs`
- 📊 **Metrics & Observability** - Built-in performance tracking and health checks
- 🔒 **Type-Safe** - Full TypeScript with strict mode enabled
- ⚡ **High Performance** - Fastify-based with clustering support via PM2
- 🎨 **Production-Ready** - Error handling, logging, validation, and graceful shutdown

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
git clone <your-repo-url>
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

## 🔧 Development

### Project Structure

```
fastify-twilio-openai-voice-agent/
├── src/
│   ├── config/          # Environment & configuration
│   ├── types/           # TypeScript type definitions
│   ├── controllers/     # API route handlers
│   ├── services/        # Business logic
│   ├── websockets/      # WebSocket handlers
│   ├── middleware/      # Custom middleware
│   ├── utils/           # Helper functions
│   ├── prompts/         # AI system prompts
│   ├── app.ts           # Fastify app factory
│   ├── server.ts        # Server lifecycle
│   └── index.ts         # Entry point
├── knowledge/           # Knowledge base data & seeding
├── logs/                # Application logs
├── dist/                # Compiled JavaScript (gitignored)
└── chroma_data/         # Vector database (gitignored)
```

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

## 📞 Configuring Twilio

1. **Purchase a Twilio phone number** with Voice capabilities

2. **Configure Voice webhook** for incoming calls:
   - URL: `https://your-domain.com/api/voice/incoming`
   - Method: `POST`

3. **Configure Status callback** (optional):
   - URL: `https://your-domain.com/api/voice/status`
   - Method: `POST`

4. **Enable Media Streams** in your Twilio console

## 🧪 Testing

### Test Knowledge Base Search

```bash
curl -X POST http://localhost:3000/api/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{"query": "What are your business hours?", "limit": 3}'
```

### Test Health Check

```bash
curl http://localhost:3000/api/health
```

### Test Call Flow

1. Call your Twilio phone number
2. Listen to the greeting
3. Start speaking - the AI will respond
4. Check logs for WebSocket events and metrics

## 🎯 Key Features Explained

### Audio Processing

The system handles real-time audio conversion between Twilio's mulaw (8kHz) and OpenAI's PCM16 (24kHz) formats:

```
Twilio (mulaw 8kHz) → Decode → Resample → PCM16 24kHz → OpenAI
OpenAI (PCM16 24kHz) → Resample → Encode → mulaw 8kHz → Twilio
```

### Knowledge Base Integration

The AI can search your knowledge base during conversations using function calling:

```typescript
{
  "type": "function",
  "name": "search_knowledge_base",
  "description": "Search for relevant information",
  "parameters": {
    "query": "user's question"
  }
}
```

### Metrics Collection

Track performance metrics for every call:
- Round-trip latency (audio → response)
- Call duration
- Knowledge searches performed
- Function calls executed
- Audio packets sent/received

## 📊 Monitoring

### Health Checks

The `/api/health` endpoint provides:
- Server uptime
- Memory usage
- Active call count
- Database connection status

### Metrics

The `/api/metrics` endpoint provides:
- Active/total calls
- Average/P95/P99 latencies
- Recent call history

### Logs

Structured JSON logs with Pino:
```json
{
  "level": "info",
  "time": "2025-10-11T...",
  "callSid": "CA123...",
  "msg": "Media stream started"
}
```

## 🐛 Troubleshooting

### Common Issues

**MongoDB connection failed**
```bash
# Ensure MongoDB is running
mongod --version
# Or use MongoDB Atlas URI
```

**ChromaDB initialization error**
```bash
# Clear ChromaDB data
rm -rf chroma_data/
npm run seed
```

**Twilio WebSocket connection fails**
- Ensure your server is publicly accessible (use ngrok for local dev)
- Check that webhook URL uses `wss://` protocol
- Verify Twilio credentials in `.env`

**OpenAI API errors**
- Verify API key is valid
- Check API rate limits
- Ensure model name is correct

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