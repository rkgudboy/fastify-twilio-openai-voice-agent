# Voice AI Agent - Fastify Implementation

A production-ready Fastify backend for real-time voice conversations using Twilio telephony, OpenAI APIs (Whisper, GPT-4o, TTS), ChromaDB vector search, and MongoDB persistence.

## Features

- 🎙️ **Real-time Voice Conversations** via Twilio telephony
- 🤖 **OpenAI Integration**
  - Speech-to-Text (Whisper API)
  - Language Model (GPT-4o) with **Function Calling**
  - Text-to-Speech (TTS API)
- 🔍 **Knowledge Base** with ChromaDB vector search
- 💾 **Persistent Storage** with MongoDB
- 🎯 **Voice Activity Detection** (VAD)
- 📊 **Analytics & Monitoring**
- 📚 **Swagger UI** - Interactive API documentation
- 🚀 **WebSocket Support** for real-time media streaming
- 🐳 **Docker Support** for easy deployment

## Architecture

This implementation follows the PDF specification with:
- **Fastify** REST API server (Node.js)
- **Sequential Pipeline**: STT → LLM → TTS
- **Function Calling**: LLM can call tools (search knowledge base, get call history, etc.)
- **WebSocket**: Real-time audio streaming from Twilio
- **VAD**: Threshold-based voice activity detection
- **Knowledge Retrieval**: RAG with ChromaDB for context-aware responses

## Tech Stack

- **Framework**: Fastify 4.x
- **Telephony**: Twilio
- **AI Services**: OpenAI (Whisper, GPT-4o, TTS)
- **Vector DB**: ChromaDB
- **Database**: MongoDB
- **Audio Processing**: Native Node.js Buffer operations
- **WebSocket**: @fastify/websocket
- **Runtime**: Node.js 20+

## Project Structure

```
fastify-implementation/
├── src/
│   ├── server.js                    # Fastify server entry point
│   ├── config/
│   │   └── config.js                # Configuration management
│   ├── routes/
│   │   ├── twilio.routes.js         # Twilio webhooks
│   │   ├── knowledge.routes.js      # Knowledge base CRUD
│   │   └── analytics.routes.js      # Analytics endpoints
│   ├── services/
│   │   ├── openai.service.js        # OpenAI API integration
│   │   ├── mongodb.service.js       # MongoDB operations
│   │   └── chromadb.service.js      # Vector database service
│   ├── websocket/
│   │   ├── connection-manager.js    # WebSocket session management
│   │   └── session.js               # Session state & audio buffering
│   ├── utils/
│   │   ├── audio-processor.js       # Audio format conversion
│   │   └── vad-detector.js          # Voice Activity Detection
│   └── functions/
│       └── tools.js                 # Function calling definitions
├── docker-compose.yml               # Multi-container setup
├── Dockerfile                       # API container
├── package.json                     # Dependencies
├── .env.example                     # Environment template
├── Makefile                         # Common commands
└── README.md                        # This file
```

## Prerequisites

- Node.js 20+
- MongoDB
- Twilio Account
- OpenAI API Key
- (Optional) Docker & Docker Compose

## Installation

### 1. Clone Repository

```bash
cd fastify-implementation
```

### 2. Install Dependencies

```bash
npm install
# or
make install
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required environment variables:

```env
# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# MongoDB
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=voice_agent_db

# ChromaDB
CHROMADB_URL=http://localhost:8000
```

### 4. Start Services

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

#### Option B: Manual Setup

Start MongoDB and ChromaDB separately, then:

```bash
npm run dev
# or
make dev
```

## Usage

### API Endpoints

The server will be available at `http://localhost:3000`

#### Interactive API Documentation (Swagger UI)

Access the interactive API documentation at:

**http://localhost:3000/docs**

Swagger UI provides:
- 📖 Complete API documentation
- 🧪 Interactive testing of all endpoints
- 📝 Request/response schemas
- 🎯 Example requests and responses
- 🔍 Search and filter endpoints by tags

#### Health Check

```bash
curl http://localhost:3000/health
```

#### Twilio Webhooks

- `POST /api/v1/twilio/incoming` - Handle incoming calls
- `POST /api/v1/twilio/status` - Call status updates
- `GET /api/v1/twilio/call/:callSid` - Get call details
- `GET /api/v1/twilio/call/:callSid/transcript` - Get transcript
- `GET /api/v1/twilio/calls/recent` - List recent calls

#### Knowledge Base

- `POST /api/v1/knowledge/documents` - Add document
- `POST /api/v1/knowledge/documents/bulk` - Bulk add
- `POST /api/v1/knowledge/search` - Search
- `GET /api/v1/knowledge/documents` - List all
- `PUT /api/v1/knowledge/documents/:id` - Update
- `DELETE /api/v1/knowledge/documents/:id` - Delete

#### Analytics

- `GET /api/v1/analytics/system` - System metrics
- `GET /api/v1/analytics/call/:callSid` - Call analytics
- `GET /api/v1/analytics/dashboard` - Dashboard data

#### WebSocket

- `WS /ws/media/:callSid` - Real-time media streaming

### Configure Twilio

#### For Development (using ngrok)

```bash
# Start ngrok
ngrok http 3000

# Configure Twilio webhook (in Twilio Console):
# Voice & Fax → A CALL COMES IN → Webhook
# URL: https://YOUR_NGROK_URL/api/v1/twilio/incoming
# HTTP: POST

# Status callback:
# https://YOUR_NGROK_URL/api/v1/twilio/status
```

#### For Production

Deploy to a server with HTTPS and use your domain in Twilio webhook configuration.

## Call Flow

1. User calls Twilio number
2. Twilio sends webhook to `/api/v1/twilio/incoming`
3. Backend returns TwiML with WebSocket URL
4. Twilio establishes WebSocket connection
5. Audio streaming begins:
   - Twilio sends mulaw audio chunks
   - Backend converts to PCM
   - VAD detects speech end
   - Audio transcribed with Whisper
6. Knowledge base searched for context
7. GPT-4o generates response (may call functions)
8. Response converted to speech with TTS
9. Audio sent back to caller
10. Call ends, transcript saved to MongoDB

## Function Calling

The LLM has access to these functions:

- **search_knowledge_base(query)** - Search ChromaDB for information
- **get_call_history(phone_number)** - Retrieve call history
- **get_current_time()** - Get current date/time

Add more functions in `src/functions/tools.js`

## Audio Processing

**Pipeline**: Twilio (mulaw 8kHz) → PCM16 → WAV → Whisper → Text → GPT-4 → Text → TTS → mulaw → Twilio

**VAD**: Threshold-based detection using RMS energy calculation
- Configurable via `VAD_THRESHOLD` (0-1)
- `SILENCE_DURATION` determines when speech ends

## Performance

**Latency per response**: ~500-1500ms
- Network (User ↔ Twilio): 20-100ms
- Network (Twilio ↔ Server): 10-50ms
- Network (Server ↔ OpenAI): 20-100ms
- Audio Processing: 5-10ms
- VAD Detection: 200-300ms
- Whisper Transcription: 200-500ms
- Knowledge Search: 100-300ms
- GPT-4 Generation: 200-500ms
- TTS Generation: 200-500ms

**Bottlenecks at 1000+ calls**:
- WebSocket sessions (no load balancer)
- MongoDB connection pool (10 max)
- In-memory sessions (no cross-instance sharing)

**Scaling Solutions**:
- Redis for distributed sessions
- NGINX/ALB with WebSocket sticky sessions
- Horizontal scaling with multiple instances
- Increase MongoDB connection pool

## Development

### Common Commands

```bash
# Install dependencies
make install

# Run in development mode (auto-reload)
make dev

# Run in production mode
make start

# Docker commands
make docker-up        # Start all services
make docker-down      # Stop all services
make docker-logs      # View logs
make docker-restart   # Restart API container

# Clean
make clean
```

### Adding Knowledge Base Documents

```bash
curl -X POST "http://localhost:3000/api/v1/knowledge/documents" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Our business hours are 9 AM to 5 PM EST",
    "metadata": {"category": "hours"}
  }'
```

### Searching Knowledge Base

```bash
curl -X POST "http://localhost:3000/api/v1/knowledge/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "business hours",
    "top_k": 3
  }'
```

## Configuration

Key settings in `.env`:

```env
# Audio Processing
VAD_THRESHOLD=0.5              # 0-1, higher = less sensitive
SILENCE_DURATION=1.5           # Seconds before processing
MAX_RECORDING_DURATION=30      # Max seconds per utterance

# OpenAI
OPENAI_MODEL=gpt-4o            # LLM model
OPENAI_TTS_VOICE=alloy         # Voice: alloy, echo, fable, onyx, nova, shimmer
OPENAI_TEMPERATURE=0.7         # 0-2, controls creativity

# Session
MAX_SESSIONS=1000              # Max concurrent sessions
SESSION_TIMEOUT=3600           # Session timeout in seconds
```

## Monitoring

### System Health

```bash
curl http://localhost:3000/health
```

### Analytics Dashboard

```bash
curl http://localhost:3000/api/v1/analytics/dashboard
```

### View Recent Calls

```bash
curl http://localhost:3000/api/v1/twilio/calls/recent
```

## Docker Deployment

### Build and Run

```bash
docker-compose up -d
```

### View Logs

```bash
docker-compose logs -f api
```

### Scale API Instances

```bash
docker-compose up -d --scale api=3
```

Note: For multiple instances, you'll need a load balancer with sticky sessions.

## Troubleshooting

### WebSocket Connection Fails

- Ensure domain supports WebSocket connections
- Check firewall rules
- Verify Twilio can reach your WebSocket URL
- Use `wss://` for HTTPS domains, `ws://` for HTTP

### Audio Quality Issues

- Check sample rate (default: 8kHz)
- Verify audio conversion pipeline
- Adjust VAD threshold

### High Latency

- Check network latency to OpenAI
- Optimize knowledge base queries
- Adjust `SILENCE_DURATION` for faster/slower response

### MongoDB Connection Errors

- Verify MongoDB is running
- Check connection string
- Increase connection pool size

## Production Considerations

1. **Security**
   - Enable HTTPS
   - Validate Twilio webhooks
   - Secure MongoDB with authentication
   - Use secrets management

2. **Monitoring**
   - Set up logging aggregation
   - Monitor WebSocket connections
   - Track latency metrics
   - Configure alerts

3. **Scaling**
   - Use Redis for sessions
   - Deploy behind load balancer
   - Scale MongoDB replica set
   - Implement rate limiting

4. **Reliability**
   - Add retry logic
   - Implement circuit breakers
   - Add request timeouts
   - Handle graceful degradation

## Differences from FastAPI Implementation

This Fastify implementation:
- Uses Node.js instead of Python
- Same architecture (STT → LLM → TTS)
- **Adds function calling** (not in FastAPI version)
- Same audio processing pipeline
- Compatible API endpoints
- Runs on port 3000 (instead of 8000)

## License

MIT

## Support

For issues:
- Check logs: `make docker-logs`
- Review health: `http://localhost:3000/health`
- Verify environment variables

## Acknowledgments

- Fastify framework
- Twilio telephony
- OpenAI AI capabilities
- ChromaDB vector search
- MongoDB data persistence
