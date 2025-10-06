# User Management API

Twitch authentication API for user management with robust error handling and professional logging.

## 🚀 Installation and Setup

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Compile TypeScript
npm run build

# Start in production
npm start
```

## 🔧 Configuration

### Required Environment Variables

```bash
# Required
TWITCH_CLIENT_ID=your_twitch_client_id_here

# Optional
NODE_ENV=development
PORT=3000
TWITCH_ISSUER=https://id.twitch.tv/oauth2
ALLOWED_ORIGINS=https://frontend-service-782869810736.europe-west1.run.app
```

## 📚 API Documentation

### Base URL
```
http://localhost:3000
```

### Endpoints

#### 🔐 POST /auth/callback
User authentication via Twitch OAuth.

**Request Body:**
```json
{
  "accessToken": "string",
  "idToken": "string", 
  "tokenType": "string",
  "expiresIn": "number",
  "scope": ["string"],
  "state": "string"
}
```

**Response 200 - Success:**
```json
{
  "success": true,
  "user": {
    "username": "string",
    "channel": {
      "id": "string",
      "name": "string", 
      "description": "string",
      "profileImageUrl": "string"
    },
    "channelsWhichIsMod": ["string"]
  }
}
```

**Response 400 - Validation Error:**
```json
{
  "error": "Validation failed: Field 'accessToken' is required",
  "status": 400,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response 401 - Authentication Error:**
```json
{
  "error": "Authentication failed: user context missing",
  "status": 401,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response 502 - Twitch API Error:**
```json
{
  "error": "Failed to connect to Twitch API",
  "status": 502,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 🏥 GET /health
API health check.

**Response 200:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "development"
}
```

## 🛡️ Security

- **Security Headers**: XSS, CSRF, and other attack protections
- **CORS**: Strict validation of allowed origins
- **Validation**: Twitch token verification
- **Logging**: Complete operation traceability

## 📝 Logging

The API uses Winston for professional logging:
- **Development**: Colored and detailed logs
- **Production**: Structured JSON logs
- **Levels**: error, warn, info, debug

## 🧪 Testing

```bash
# Tests with coverage
npm test

# Tests in development mode
npm run test:dev
```

## 🏗️ Architecture

```
src/
├── config/           # Configuration (Passport, environment)
├── controllers/      # API controllers
├── middlewares/      # Middlewares (security, errors)
├── models/          # Data models
├── routes/          # Route definitions
├── services/        # Business services (Twitch API)
├── strategies/      # Passport strategies
└── utils/           # Utilities (logger)
```

## 🔄 Authentication Flow

1. **Frontend** → Sends Twitch tokens to `/auth/callback`
2. **API** → Validates tokens with Twitch
3. **API** → Retrieves user data
4. **API** → Returns user information

## 📋 Error Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 400  | Validation error |
| 401  | Authentication error |
| 403  | CORS not allowed |
| 404  | Route not found |
| 500  | Internal server error |
| 502  | External API error (Twitch) |

## 🚀 Deployment

```bash
# Build for production
npm run build

# Start in production
npm start
```

The API handles graceful shutdown with SIGTERM/SIGINT.

