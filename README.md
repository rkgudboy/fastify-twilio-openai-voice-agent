# 🎙️ Fastify Twilio OpenAI Voice Agent

A production-ready voice AI agent system built with Fastify, Twilio Media Streams, OpenAI APIs (Whisper, GPT-4o, TTS), ChromaDB vector database, and MongoDB. Features real-time conversational AI with semantic knowledge base search, function calling capabilities, and comprehensive API documentation.

## ✨ Features

- 🎯 **Real-time Voice AI** - Sub-second latency voice conversations with VAD-based speech detection
- 📞 **Twilio Integration** - PSTN connectivity with WebSocket media streaming
- 🤖 **OpenAI AI Pipeline** - Whisper (STT), GPT-4o (LLM with function calling), TTS (speech synthesis)
- 🧠 **Semantic Search** - ChromaDB vector database for intelligent knowledge retrieval
- 💾 **MongoDB Storage** - Persistent storage for call logs, sessions, transcripts, and analytics
- 📚 **Swagger/OpenAPI** - Complete API documentation at `/docs`
- 🔧 **Function Calling** - LLM can invoke tools (knowledge search, call history, etc.)
- 📊 **Metrics & Observability** - Built-in performance tracking and health checks
- 🐳 **Docker Support** - Complete containerization with Docker Compose

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
│   ├─ Audio Conversion (mulaw↔PCM)  │
│   ├─ VAD Detection                 │
│   └─ Session Management            │
└──────┬─────────────────────────────┘
       │
       ├──▶ OpenAI APIs (Whisper, GPT-4o, TTS)
       ├──▶ ChromaDB (Vector Search & RAG)
       └──▶ MongoDB (Persistent Data)
```

**Pipeline Flow:** Twilio (mulaw) → WebSocket → VAD → Whisper (STT) → GPT-4o (LLM + Function Calls) → TTS → mulaw → Twilio

## 📦 Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | Node.js 22+ | Server-side JavaScript |
| **Framework** | Fastify 5.x | Fast, low-overhead web framework |
| **Voice** | Twilio Media Streams | PSTN connectivity & audio streaming |
| **AI** | OpenAI APIs | Whisper (STT), GPT-4o (LLM), TTS |
| **Vector DB** | ChromaDB | Semantic knowledge base search (RAG) |
| **Database** | MongoDB | Persistent data storage |
| **Docs** | Swagger/OpenAPI 3.0 | Interactive API documentation |
| **Logger** | Pino | Fast structured logging |
| **WebSocket** | @fastify/websocket | Real-time bidirectional communication |
| **Docker** | Docker Compose | Containerization & orchestration |

## 🚀 Quick Start

### Prerequisites

- Node.js 22+ (with ES modules support)
- MongoDB (local or Atlas)
- Twilio account with phone number
- OpenAI API key
- (Optional) Docker & Docker Compose

### 1. Installation

```bash
# Navigate to directory
cd fastify-implementation

# Install dependencies
npm install
# or
make install

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
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=voice_agent_db

# ChromaDB
CHROMADB_URL=http://localhost:8000
```

### 3. Start Services

#### Option A: Using Docker Compose (Recommended)

```bash
make docker-up
# or
docker-compose up -d
```

This starts:
- MongoDB on port 27017
- ChromaDB on port 8000
- Fastify API on port 3000

#### Option B: Manual Development

Start MongoDB and ChromaDB separately, then:

```bash
npm run dev
# or
make dev
```

### 4. View API Documentation

Open your browser to:
- **Swagger UI**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/health
- **Metrics**: http://localhost:3000/api/v1/analytics/system

## 📖 API Endpoints

### Health & Monitoring

- `GET /health` - Health check with database connectivity
- `GET /api/v1/analytics/system` - System metrics and performance stats
- `GET /api/v1/analytics/dashboard` - Dashboard data with call statistics

### Knowledge Base

- `GET /api/v1/knowledge/documents` - List all knowledge documents
- `POST /api/v1/knowledge/search` - Semantic search with query
- `POST /api/v1/knowledge/documents` - Create new document
- `POST /api/v1/knowledge/documents/bulk` - Bulk import documents
- `PUT /api/v1/knowledge/documents/:id` - Update document
- `DELETE /api/v1/knowledge/documents/:id` - Delete document

### Voice (Twilio Webhooks)

- `POST /api/v1/twilio/incoming` - Incoming call webhook (returns TwiML)
- `POST /api/v1/twilio/status` - Call status updates
- `GET /api/v1/twilio/call/:callSid` - Get call details
- `GET /api/v1/twilio/call/:callSid/transcript` - Get call transcript
- `GET /api/v1/twilio/calls/recent` - List recent calls
- `WS /ws/media/:callSid` - WebSocket for real-time media streaming

### Analytics

- `GET /api/v1/analytics/call/:callSid` - Individual call analytics and metrics


### Testing Locally with Twilio

For development, use ngrok to expose your local server:

```bash
# Start ngrok tunnel
ngrok http 3000

# Configure Twilio webhook (in Twilio Console):
# Voice & Fax → A CALL COMES IN → Webhook
# URL: https://YOUR_NGROK_URL/api/v1/twilio/incoming
# HTTP: POST

# Status callback:
# URL: https://YOUR_NGROK_URL/api/v1/twilio/status
# HTTP: POST
```

For production, deploy to a server with HTTPS and configure your domain in Twilio.

## 🔄 Call Flow Architecture

1. **Call Initiation**: User calls Twilio number → POST to `/api/v1/twilio/incoming`
2. **TwiML Response**: Backend returns TwiML with WebSocket URL (`wss://domain/ws/media/{callSid}`)
3. **WebSocket Connection**: Twilio establishes connection, handled by `ConnectionManager`
4. **Audio Streaming Loop**:
   - Twilio sends mulaw audio chunks via WebSocket
   - Audio buffered and converted: mulaw → PCM16
   - VAD detects speech end (configurable silence threshold)
   - When speech ends: processing pipeline triggers
5. **AI Processing Pipeline** (sequential):
   - **Transcribe**: Convert PCM → WAV, send to Whisper API
   - **Search**: Query ChromaDB for relevant context (RAG)
   - **Generate**: Send transcript + context to GPT-4o (may invoke functions)
   - **Synthesize**: Convert response text to speech via TTS API
   - **Send**: Convert to mulaw and stream back via WebSocket
6. **Termination**: Call ends → session cleaned up, transcript saved to MongoDB

### Function Calling

The LLM has access to these tool functions (defined in `src/functions/tools.js`):

- **`search_knowledge_base(query)`** - Search ChromaDB for information
- **`get_call_history(phone_number)`** - Retrieve previous call history
- **`get_current_time()`** - Get current date/time

To add more functions, update the tools definition in `src/functions/tools.js` and implement handlers.

### Audio Processing Pipeline

**Format Flow**: Twilio (mulaw 8kHz) → PCM16 → WAV → Whisper → Text → GPT-4o → Text → TTS → mulaw → Twilio

**Voice Activity Detection (VAD)**:
- Threshold-based detection using RMS energy calculation
- Configurable via `VAD_THRESHOLD` (0.0-1.0, higher = less sensitive)
- `SILENCE_DURATION` determines when speech ends (default: 1.5s)
- Prevents cutoff while allowing responsive interactions

## 📊 Performance & Scaling

### Latency Breakdown (per interaction)

**Total Response Time**: ~500-1500ms

| Stage | Latency |
|-------|---------|
| Network (User ↔ Twilio) | 20-100ms |
| Network (Twilio ↔ Server) | 10-50ms |
| Network (Server ↔ OpenAI) | 20-100ms |
| Audio Processing | 5-10ms |
| VAD Detection (silence wait) | 200-300ms |
| Whisper Transcription | 200-500ms |
| ChromaDB Search | 100-300ms |
| GPT-4o Generation | 200-500ms |
| TTS Generation | 200-500ms |

### Scaling Considerations

**Current Bottlenecks** (at 1000+ concurrent calls):
- In-memory session storage (doesn't scale across instances)
- WebSocket sticky sessions required (no built-in load balancing)
- MongoDB connection pool limits (default: 10)
- Single-instance architecture

**Scaling Solutions**:
1. **Session Management**: Use Redis for distributed session storage
2. **Load Balancing**: NGINX/ALB with WebSocket sticky sessions enabled
3. **Horizontal Scaling**: Deploy multiple instances behind load balancer
4. **Database**: Increase MongoDB connection pool (`MONGODB_MAX_POOL_SIZE`)
5. **Caching**: Add response caching for common queries

**Not Yet Implemented**:
- Streaming responses (to reduce perceived latency)
- Interrupt handling (mid-response cancellation)
- Redis session store (for multi-instance deployment)
- Request signature validation (currently disabled)

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `3000` | Server port |
| `HOST` | No | `0.0.0.0` | Server host |
| `TWILIO_ACCOUNT_SID` | Yes | - | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Yes | - | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Yes | - | Twilio phone number |
| `OPENAI_API_KEY` | Yes | - | OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4o` | GPT model for conversations |
| `OPENAI_TTS_VOICE` | No | `alloy` | TTS voice (alloy, echo, fable, onyx, nova, shimmer) |
| `OPENAI_TEMPERATURE` | No | `0.7` | LLM temperature (0.0-2.0) |
| `MONGODB_URL` | No | `mongodb://localhost:27017` | MongoDB connection URI |
| `MONGODB_DB_NAME` | No | `voice_agent_db` | MongoDB database name |
| `CHROMADB_URL` | No | `http://localhost:8000` | ChromaDB server URL |
| `VAD_THRESHOLD` | No | `0.5` | Voice activity threshold (0.0-1.0) |
| `SILENCE_DURATION` | No | `1.5` | Silence duration before processing (seconds) |
| `MAX_RECORDING_DURATION` | No | `30` | Max recording length (seconds) |
| `MAX_SESSIONS` | No | `1000` | Max concurrent sessions |
| `SESSION_TIMEOUT` | No | `3600` | Session timeout (seconds) |
| `LOG_LEVEL` | No | `info` | Logging level (trace, debug, info, warn, error) |

### Example API Usage

**Add Knowledge Base Document**:
```bash
curl -X POST "http://localhost:3000/api/v1/knowledge/documents" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Our business hours are 9 AM to 5 PM EST",
    "metadata": {"category": "hours"}
  }'
```

**Search Knowledge Base**:
```bash
curl -X POST "http://localhost:3000/api/v1/knowledge/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "business hours", "top_k": 3}'
```

**View Recent Calls**:
```bash
curl http://localhost:3000/api/v1/twilio/calls/recent
```

**Get Call Transcript**:
```bash
curl http://localhost:3000/api/v1/twilio/call/{callSid}/transcript
```

**Check System Health**:
```bash
curl http://localhost:3000/health
```

## 🐳 Docker Deployment

### Build and Run

```bash
# Start all services (MongoDB, ChromaDB, API)
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop all services
docker-compose down

# Restart API only
docker-compose restart api
```

### Scale API Instances

```bash
docker-compose up -d --scale api=3
```


## 🏛️ Architecture Notes

### Key Implementation Patterns

**Session Management**: Each call gets a `CallSession` object stored in `ConnectionManager.active_sessions`. Sessions are in-memory and don't persist across server restarts.

**Audio Pipeline**: All audio flows through format conversions:
- Twilio uses mulaw at 8kHz (telephony standard)
- OpenAI Whisper expects WAV/MP3
- TTS returns audio that we convert back to mulaw

**Voice Activity Detection**: Simple threshold-based RMS energy calculation. Tracks speech/silence and triggers processing after `SILENCE_DURATION` of silence.

**Knowledge Base RAG**: ChromaDB provides vector search for Retrieval-Augmented Generation. Context is retrieved before GPT-4o generation to ground responses.


## 📧 Support

For issues and questions:
- Check logs: `make docker-logs` or `docker-compose logs -f api`
- Review health endpoint: `http://localhost:3000/health`
- Verify environment variables in `.env`
- Check Swagger docs: `http://localhost:3000/docs`
- Review call transcripts: `/api/v1/twilio/calls/recent`

---
