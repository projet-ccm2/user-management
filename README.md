# User Management API

Twitch authentication API for user management with robust error handling and professional logging.

## Installation and Setup

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

## Configuration

### Environment Variables

1. **Copy the example file**:

   ```bash
   cp .env.example .env
   ```

2. **Configure your variables** in the `.env` file:

```bash
# Required
TWITCH_CLIENT_ID=your_twitch_client_id_here

# Optional
NODE_ENV=development
PORT=3000
TWITCH_ISSUER=https://id.twitch.tv/oauth2
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
DB_SERVICE_URL=http://localhost:3001

# VPC Token (bastion access to db gateway)
USER_MANAGEMENT_URL=http://localhost:3000
JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRES_IN_SECONDS=3600
GCP_SERVICE_URL=http://localhost:3000
SKIP_GCP_AUTH=true
```

### Get your TWITCH_CLIENT_ID

1. Go to [https://dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps)
2. Create a new application
3. Copy the **Client ID** into your `.env` file

### Configuration Files

- `.env.example`: Template with required variables
- `ENVIRONMENT_VARIABLES.md`: Detailed variable documentation
- `.env`: Your local configuration (do not commit)

## API Documentation

### Base URL

```
http://localhost:3000
```

### Endpoints

#### POST /auth/callback

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
  },
  "userId": "string"
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

#### POST /tokens

Obtains a JWT for VPC access (db gateway). Used by bastions (user-management via auto-call, or second BFF).

**Authentication:** Requires `Authorization: Bearer <gcp-identity-token>` (GCP identity token). When `SKIP_GCP_AUTH=true` (local dev), auth is skipped.

**Request:**

```bash
curl -X POST https://user-management.example.com/tokens \
  -H "Authorization: Bearer <gcp-identity-token>"
```

**Response 200:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 401 - Authentication Error:**

```json
{
  "error": "Missing or invalid Authorization header",
  "status": 401,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

Use the returned JWT in `Authorization: Bearer <jwt>` when calling the db gateway.

#### GET /health

API health check. Probes the db gateway and includes its health response.

**Response 200:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "development",
  "dbGateway": {
    "status": "healthy",
    "response": {
      "status": "healthy",
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

`dbGateway.response` contient exactement ce que renvoie le db gateway sur son endpoint `/health`.

When the db gateway is unreachable, `dbGateway` contains:

```json
{
  "status": "unhealthy",
  "error": "Connection refused"
}
```

## Security

- **Security Headers**: XSS, CSRF, and other attack protections
- **CORS**: Strict validation of allowed origins
- **Validation**: Twitch token verification
- **Logging**: Complete operation traceability

## Logging

The API uses Winston for professional logging:

- **Development**: Colored and detailed logs
- **Production**: Structured JSON logs
- **Levels**: error, warn, info, debug

## Testing

```bash
# Tests with coverage
npm test

# Tests in development mode
npm run test:dev
```

## Architecture

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

## Accès VPC (Bastion architecture)

user-management and the second BFF act as **bastions** outside the VPC. The db gateway is private inside the VPC. To access it, both bastions obtain a JWT via `POST /tokens` on user-management.

- **user-management** : auto-calls its own `POST /tokens` before each db gateway request
- **Second BFF** : calls `POST /tokens` on user-management to get a JWT, then uses it for db gateway requests

Both bastions send `Authorization: Bearer <jwt>` to the db gateway (no X-User-\* headers).

### Variables d'environnement VPC

| Variable                 | Description                                                         |
| ------------------------ | ------------------------------------------------------------------- |
| `USER_MANAGEMENT_URL`    | URL of user-management for POST /tokens (auto-call and second BFF)  |
| `JWT_SECRET`             | Secret to sign VPC JWTs (required in production)                    |
| `JWT_EXPIRES_IN_SECONDS` | JWT expiry (default: 3600)                                          |
| `GCP_SERVICE_URL`        | GCP service URL for identity token audience (Cloud Run URL in prod) |
| `SKIP_GCP_AUTH`          | Set to `true` for local dev when not on GCP                         |

### Second BFF integration

1. Call `POST /tokens` on user-management with `Authorization: Bearer <gcp-identity-token>`
2. Use the returned `token` in `Authorization: Bearer <jwt>` for all db gateway requests

## Authentication Flow

1. **Frontend** → Sends Twitch tokens to `/auth/callback`
2. **API** → Validates tokens with Twitch
3. **API** → Retrieves user data
4. **API** → Returns user information

## Error Codes

| Code | Description                 |
| ---- | --------------------------- |
| 200  | Success                     |
| 400  | Validation error            |
| 401  | Authentication error        |
| 403  | CORS not allowed            |
| 404  | Route not found             |
| 500  | Internal server error       |
| 502  | External API error (Twitch) |

## Deployment

```bash
# Build for production
npm run build

# Start in production
npm start
```
