# API Reference

This document provides a complete reference for the AWY API. The API is RESTful and uses JSON for request and response bodies.

## Base URL

```
Production: https://api.awy.com
Development: http://localhost:3001
```

## Authentication

AWY uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Getting a Token

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "student"
  }
}
```

## Error Handling

The API uses conventional HTTP response codes and returns error details in JSON format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "value": "invalid-email"
    }
  }
}
```

### HTTP Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

## Endpoints

### Authentication

#### POST /auth/login
Authenticate a user and receive a JWT token.

**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "token": "string",
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "student" | "parent" | "admin"
  }
}
```

#### POST /auth/register
Register a new user account.

**Request:**
```json
{
  "email": "string",
  "password": "string",
  "name": "string",
  "role": "student" | "parent",
  "organizationId": "string"
}
```

#### POST /auth/logout
Invalidate the current JWT token.

#### GET /auth/me
Get current user information.

**Response:**
```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "role": "string",
  "organizationId": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Users

#### GET /users
Get a list of users (admin only).

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `search` (string): Search by name or email
- `role` (string): Filter by role
- `organizationId` (string): Filter by organization

**Response:**
```json
{
  "users": [
    {
      "id": "string",
      "email": "string",
      "name": "string",
      "role": "string",
      "organizationId": "string",
      "lastActive": "string",
      "createdAt": "string"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

#### GET /users/:id
Get a specific user by ID.

#### PUT /users/:id
Update a user (admin or self only).

#### DELETE /users/:id
Delete a user (admin only).

### Pairings

#### GET /pairings
Get user's pairings.

**Response:**
```json
{
  "pairings": [
    {
      "id": "string",
      "studentId": "string",
      "parentId": "string",
      "status": "active" | "pending" | "inactive",
      "createdAt": "string",
      "student": {
        "id": "string",
        "name": "string",
        "email": "string"
      },
      "parent": {
        "id": "string",
        "name": "string",
        "email": "string"
      }
    }
  ]
}
```

#### POST /pairings
Create a new pairing.

**Request:**
```json
{
  "parentEmail": "string",
  "message": "string"
}
```

#### PUT /pairings/:id
Update a pairing (accept/reject invitation).

**Request:**
```json
{
  "status": "active" | "inactive"
}
```

#### DELETE /pairings/:id
Delete a pairing.

### Messages

#### GET /messages
Get messages for a pairing.

**Query Parameters:**
- `pairingId` (string): Pairing ID
- `before` (string): Get messages before this timestamp
- `limit` (number): Number of messages (default: 50)

**Response:**
```json
{
  "messages": [
    {
      "id": "string",
      "pairingId": "string",
      "senderId": "string",
      "content": "string",
      "type": "text" | "image" | "file",
      "createdAt": "string",
      "readAt": "string",
      "sender": {
        "id": "string",
        "name": "string"
      }
    }
  ]
}
```

#### POST /messages
Send a new message.

**Request:**
```json
{
  "pairingId": "string",
  "content": "string",
  "type": "text" | "image" | "file"
}
```

#### PUT /messages/:id/read
Mark a message as read.

### Memories

#### GET /memories
Get memories for a pairing.

**Query Parameters:**
- `pairingId` (string): Pairing ID
- `page` (number): Page number
- `limit` (number): Items per page

**Response:**
```json
{
  "memories": [
    {
      "id": "string",
      "pairingId": "string",
      "uploaderId": "string",
      "title": "string",
      "description": "string",
      "imageUrl": "string",
      "status": "pending" | "approved" | "rejected",
      "createdAt": "string",
      "uploader": {
        "id": "string",
        "name": "string"
      }
    }
  ]
}
```

#### POST /memories
Upload a new memory.

**Request (multipart/form-data):**
- `pairingId` (string): Pairing ID
- `title` (string): Memory title
- `description` (string): Memory description
- `image` (file): Image file

#### PUT /memories/:id
Update a memory (admin approval).

**Request:**
```json
{
  "status": "approved" | "rejected",
  "reason": "string"
}
```

### Presence

#### GET /presence/:pairingId
Get presence status for a pairing.

**Response:**
```json
{
  "student": {
    "status": "online" | "away" | "offline",
    "lastSeen": "string"
  },
  "parent": {
    "status": "online" | "away" | "offline",
    "lastSeen": "string"
  }
}
```

#### POST /presence
Update user's presence status.

**Request:**
```json
{
  "status": "online" | "away" | "offline"
}
```

### Organizations

#### GET /organizations
Get organizations (admin only).

#### POST /organizations
Create a new organization (admin only).

#### PUT /organizations/:id
Update an organization (admin only).

### Configuration

#### GET /config
Get widget configuration for an organization.

**Query Parameters:**
- `organizationId` (string): Organization ID

**Response:**
```json
{
  "theme": {
    "primaryColor": "#ff6b9d",
    "secondaryColor": "#4ecdc4",
    "position": "bottom-right",
    "size": "medium"
  },
  "features": {
    "chat": true,
    "videoCalls": true,
    "memories": true,
    "notifications": true
  },
  "privacy": {
    "defaultVisibility": "visible",
    "quietHours": {
      "enabled": true,
      "start": "22:00",
      "end": "08:00"
    }
  }
}
```

#### PUT /config
Update widget configuration (admin only).

### Analytics

#### GET /analytics/overview
Get analytics overview (admin only).

**Response:**
```json
{
  "totalUsers": 1000,
  "activePairings": 750,
  "messagesThisWeek": 5000,
  "callsThisWeek": 200,
  "userGrowth": 12.5,
  "engagementRate": 87.3
}
```

#### GET /analytics/usage
Get detailed usage analytics (admin only).

**Query Parameters:**
- `period` (string): "day" | "week" | "month"
- `start` (string): Start date (ISO 8601)
- `end` (string): End date (ISO 8601)

## WebSocket API

AWY uses WebSocket for real-time communication. Connect to `/ws` with a valid JWT token.

### Connection

```javascript
const ws = new WebSocket('wss://api.awy.com/ws?token=your-jwt-token');
```

### Message Format

All WebSocket messages use this format:

```json
{
  "type": "message_type",
  "data": {
    // Message-specific data
  }
}
```

### Message Types

#### Client to Server

**join_pairing**
Join a pairing room for real-time updates.
```json
{
  "type": "join_pairing",
  "data": {
    "pairingId": "string"
  }
}
```

**send_message**
Send a chat message.
```json
{
  "type": "send_message",
  "data": {
    "pairingId": "string",
    "content": "string",
    "type": "text"
  }
}
```

**typing_start**
Indicate user is typing.
```json
{
  "type": "typing_start",
  "data": {
    "pairingId": "string"
  }
}
```

**typing_stop**
Indicate user stopped typing.
```json
{
  "type": "typing_stop",
  "data": {
    "pairingId": "string"
  }
}
```

**presence_update**
Update presence status.
```json
{
  "type": "presence_update",
  "data": {
    "status": "online" | "away" | "offline"
  }
}
```

#### Server to Client

**message_received**
New message received.
```json
{
  "type": "message_received",
  "data": {
    "id": "string",
    "pairingId": "string",
    "senderId": "string",
    "content": "string",
    "type": "text",
    "createdAt": "string",
    "sender": {
      "id": "string",
      "name": "string"
    }
  }
}
```

**typing_indicator**
Someone is typing.
```json
{
  "type": "typing_indicator",
  "data": {
    "pairingId": "string",
    "userId": "string",
    "isTyping": true
  }
}
```

**presence_changed**
Presence status changed.
```json
{
  "type": "presence_changed",
  "data": {
    "userId": "string",
    "status": "online" | "away" | "offline",
    "lastSeen": "string"
  }
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Authentication endpoints**: 5 requests per minute
- **General API**: 100 requests per minute
- **WebSocket messages**: 60 messages per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time (Unix timestamp)

## SDK Usage

For easier integration, use the AWY JavaScript SDK:

```javascript
import AWY from '@awy/sdk';

const awy = new AWY({
  apiUrl: 'https://api.awy.com',
  token: 'your-jwt-token'
});

// Send a message
await awy.messages.send({
  pairingId: 'pairing-id',
  content: 'Hello!',
  type: 'text'
});

// Listen for real-time events
awy.on('message_received', (message) => {
  console.log('New message:', message);
});
```

## Examples

### Complete Chat Integration

```javascript
// Initialize AWY
const awy = new AWY({
  apiUrl: 'https://api.awy.com',
  token: localStorage.getItem('awy_token')
});

// Get user's pairings
const pairings = await awy.pairings.list();

// Join a pairing for real-time updates
await awy.websocket.joinPairing(pairings[0].id);

// Send a message
await awy.messages.send({
  pairingId: pairings[0].id,
  content: 'Hello from the API!',
  type: 'text'
});

// Listen for new messages
awy.on('message_received', (message) => {
  displayMessage(message);
});

// Update presence
await awy.presence.update('online');
```

### Widget Embedding

```html
<!DOCTYPE html>
<html>
<head>
  <title>My University Portal</title>
</head>
<body>
  <h1>Welcome to University Portal</h1>
  
  <!-- AWY Widget -->
  <script 
    src="https://widget.awy.com/awy.js" 
    data-org="my-university"
    data-position="bottom-right"
    data-theme="auto">
  </script>
</body>
</html>
```

For more examples and detailed integration guides, see our [Widget Integration Guide](widget-integration.md).

