# API Documentation

The Silent Review API is a REST API served by `apps/api`. Base path for all endpoints is `/api` (except `/health`).

## Base URL

- Development: `http://localhost:3001`
- Production: `https://<your-domain>/api`

## Authentication

Most endpoints require authentication via an `Authorization: Bearer <accessToken>` header. Access tokens are returned by `/api/auth/login`, `/api/auth/register`, and `/api/auth/oauth/:provider`.

Refresh tokens are stored in an HTTP-only cookie named `refreshToken`.

## Health

### `GET /health`

Public health check.

**Response:**
```json
{
  "status": "ok",
  "service": "silent-review-api",
  "timestamp": "2026-07-23T19:00:00.000Z"
}
```

## Authentication

### `POST /api/auth/register`

Create a new account.

**Body:**
```json
{
  "email": "user@example.com",
  "username": "newuser",
  "password": "SecurePass123!",
  "displayName": "New User"
}
```

**Response:**
```json
{
  "user": { "id": "...", "email": "...", "username": "..." },
  "accessToken": "eyJ..."
}
```

### `POST /api/auth/login`

Log in with email and password.

**Body:**
```json
{
  "email": "demo@silentreview.app",
  "password": "DemoPass123!"
}
```

### `POST /api/auth/refresh`

Refresh the access token using the HTTP-only refresh cookie.

### `POST /api/auth/logout`

Revoke the current refresh token and clear the cookie.

### `GET /api/auth/me`

Return the current authenticated user.

### `GET /api/auth/providers`

List available OAuth providers.

### `POST /api/auth/oauth/:provider`

Authenticate via OAuth provider (`google`, `apple`, `tiktok`, `instagram`).

## Feed

### `GET /api/feed`

Personalized "For You" feed.

**Query:** `?cursor=<cursor>&limit=20`

### `GET /api/feed/following`

Feed from followed users (requires auth).

### `GET /api/feed/trending`

Trending reviews.

### `GET /api/feed/category/:category`

Reviews filtered by product category.

## Reviews

### `POST /api/reviews`

Create a new review (requires auth).

**Body:**
```json
{
  "productId": "...",
  "videoUrl": "...",
  "thumbnailUrl": "...",
  "duration": 5,
  "format": "video/webm",
  "rating": 8,
  "caption": "Great product!",
  "productTag": "electronics"
}
```

### `GET /api/reviews/:id`

Get a single review.

## Guesses

### `POST /api/guesses/:reviewId`

Submit a rating guess (requires auth).

**Body:**
```json
{
  "guessedRating": 8
}
```

### `GET /api/guesses/:reviewId/stats`

Guess statistics for a review.

### `GET /api/guesses/:reviewId/reveal`

Reveal the actual rating and guess distribution.

## Users & Social

### `GET /api/users/:id`

Public profile for a user.

### `GET /api/users/:id/reviews`

Reviews created by a user.

### `GET /api/users/:id/achievements`

Achievements unlocked by a user.

### `GET /api/comments/reviews/:reviewId/comments`

List comments on a review.

### `POST /api/comments/reviews/:reviewId/comments`

Add a comment (requires auth).

### `DELETE /api/comments/:id`

Delete a comment (requires auth).

## Gamification

### `GET /api/gamification/me`

Current user's streak, points, and achievements (requires auth).

### `POST /api/gamification/activity`

Record user activity for streak calculation (requires auth).

### `GET /api/gamification/leaderboard`

Leaderboard (global, weekly, or friends).

## Revenue

### `GET /api/revenue/affiliate/:productId`

Generate affiliate link for a product.

### `POST /api/revenue/tips`

Create a tip intent for a creator (requires auth).

### `POST /api/revenue/tips/:id/confirm`

Confirm a tip payment (requires auth).

### `GET /api/revenue/subscription`

Get current subscription status (requires auth).

### `POST /api/revenue/subscription`

Subscribe to premium (requires auth).

### `DELETE /api/revenue/subscription`

Cancel premium subscription (requires auth).

## Feature Flags & Compliance

### `GET /api/features`

Public list of enabled feature flags.

### `GET /api/export/me`

Download a JSON export of the authenticated user's data (GDPR/CCPA).

## Uploads

### `POST /api/upload/presigned`

Get a presigned URL for direct video upload (requires auth).

## WebSockets

Realtime events use Socket.io at the same origin under the default path `/socket.io/`.

## Errors

Error responses follow this shape:

```json
{
  "error": "Human-readable message"
}
```

HTTP status codes:
- `200` OK
- `201` Created
- `400` Bad Request
- `401` Unauthorized
- `403` Forbidden
- `404` Not Found
- `409` Conflict
- `503` Service Unavailable (feature disabled or degraded)
