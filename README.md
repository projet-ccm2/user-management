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
AUTH_SERVICE_URL=http://localhost:3000
JWT_SECRET=dev-secret-change-in-production
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

#### GET /users/:id

Retrieves a user by their Twitch user ID. Used by the Twitch Panel to check if a user exists in the system.

**Authentication:** Twitch OAuth (same pattern as `/auth/callback`). Send `accessToken` and `idToken` in the request body.

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

**Response 200 - User found:**

```json
{
  "success": true,
  "user": {
    "id": "string",
    "username": "string",
    "profileImageUrl": "string | null",
    "channelDescription": "string | null",
    "scope": "string | null",
    "lastUpdateTimestamp": "2024-01-15T10:30:00.000Z",
    "xp": 0
  }
}
```

**Response 401 - Authentication Error:**

```json
{
  "error": "Authentication required",
  "status": 401,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response 404 - User not found:**

```json
{
  "error": "User not found",
  "status": 404,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### PUT /channels/me

Updates the Discord webhook URL of the authenticated user's channel.

**Authentication:** Twitch OAuth (same pattern as `/auth/callback` and `/auth/delete-account`). Send `accessToken` and `idToken` in the request body along with `discordWebhookUrl`.

**Request Body:**

```json
{
  "accessToken": "string",
  "idToken": "string",
  "tokenType": "string",
  "expiresIn": "number",
  "scope": ["string"],
  "state": "string",
  "discordWebhookUrl": "https://discord.com/api/webhooks/123/abc"
}
```

- `discordWebhookUrl` (required): A valid Discord webhook URL, or `null` to remove the link.

**Response 200 - Success:**

```json
{
  "success": true,
  "channel": {
    "id": "string",
    "name": "string",
    "discordWebhookUrl": "https://discord.com/api/webhooks/123/abc"
  }
}
```

**Response 400 - Validation Error:**

```json
{
  "error": "Validation failed: Field 'discordWebhookUrl' is required",
  "status": 400,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

```json
{
  "error": "Validation failed: 'discordWebhookUrl' must be a valid URL",
  "status": 400,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response 401 - Authentication Error:**

```json
{
  "error": "Authentication required",
  "status": 401,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### POST /tokens

Obtains a JWT for VPC access (db gateway). Used by bastions (user-management via auto-call, or second BFF).

**Authentication:** Requires `Authorization: Bearer <gcp-identity-token>` (GCP identity token). When `NODE_ENV=development`, auth is skipped.

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

`dbGateway.response` contains exactly what the db gateway returns on its `/health` endpoint.

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

## VPC Access (Bastion architecture)

user-management and the second BFF act as **bastions** outside the VPC. The db gateway is a private Cloud Run service deployed with `--no-allow-unauthenticated`. To access it, bastions use the **double header pattern**:

- **user-management** : auto-calls its own `POST /tokens` before each db gateway request
- **Second BFF** : calls `POST /tokens` on user-management to get a JWT, then uses it for db gateway requests

### Double header pattern

The db gateway's Cloud Run ingress requires a GCP identity token in `Authorization`. The app JWT is sent in `X-VPC-Token`:

| Environment          | `Authorization`                           | `X-VPC-Token`            |
| -------------------- | ----------------------------------------- | ------------------------ |
| **Development**      | `Bearer <app-jwt>` (as before)            | Not used                 |
| **Int / Production** | `Bearer <gcp-identity-token>` (Cloud Run) | `<app-jwt>` (db-gateway) |

In development, the app JWT is sent in `Authorization` as before (no GCP token, local service has no auth).

### VPC Environment Variables

| Variable           | Description                                                              |
| ------------------ | ------------------------------------------------------------------------ |
| `AUTH_SERVICE_URL` | URL of user-management for POST /tokens and GCP identity token audience  |
| `DB_SERVICE_URL`   | URL of the db gateway (also used as GCP identity token audience)         |
| `JWT_SECRET`       | Secret to sign VPC JWTs (required in production)                         |
| `NODE_ENV`         | When `development`, GCP auth is skipped (local dev). Otherwise required. |

### Second BFF integration

1. Call `POST /tokens` on user-management with `Authorization: Bearer <gcp-identity-token>`
2. Use the returned `token` with the double header pattern to call the db gateway

For more information on the double header pattern, implementation examples, and checklists for new services, see [VPC Token Integration Guide](docs/VPC_TOKEN_INTEGRATION.md).

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
