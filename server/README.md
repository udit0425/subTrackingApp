# SubTracker API

Express + MySQL backend for accounts (email verification and password sign-in) and encrypted subscription storage.

## Setup

```bash
cd server
npm install
cp .env.example .env          # then fill in the values
openssl rand -base64 32       # use output for DATA_ENCRYPTION_KEY
openssl rand -base64 32       # use output for EMAIL_HASH_KEY
npm run migrate               # creates the tables
npm run dev                   # http://localhost:3000
```

Without `SMTP_URL`, development mode prints verification links to the console instead of sending email. In production the server refuses to start without `SMTP_URL`.

## Keys

- `DATA_ENCRYPTION_KEY` encrypts names, emails and subscription data (AES-256-GCM). Losing it makes stored data unreadable, so back it up in a secrets manager. Changing it does not re-encrypt existing rows.
- `EMAIL_HASH_KEY` makes a keyed hash of each email for lookup. Changing it breaks sign-in for existing accounts.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/signup` | Create an account and email a verification link (always returns 202) |
| GET | `/auth/verify?token=` | Confirms the email (link is single use, 24 h) |
| POST | `/auth/resend` | Send a fresh verification link (always returns 202) |
| POST | `/auth/login` | Returns a session token (30 days) for verified accounts |
| GET | `/auth/me` | Current user |
| POST | `/auth/logout` | Revokes the session |
| GET/POST | `/subscriptions` | List and create |
| PUT/DELETE | `/subscriptions/:id` | Update and delete (own records only) |

Send the session token as `Authorization: Bearer <token>`.

## Tests

`npm test` runs against MySQL. Set `TEST_DATABASE_URL` to a database that can be wiped (the tests truncate its tables).

## Not yet built

- Password reset (the email channel exists, so it is a small follow-up).
- Rate limits are per process. Run a single instance or move the limiter to Redis before scaling out.
