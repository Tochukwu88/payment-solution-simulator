# Payment Processing Simulation

A Node.js / Express microservice that simulates payment processing. It exposes a RESTful API for creating payments, retrieving them by ID, and updating their status, and it simulates asynchronous payment processing through a background worker.

Built with **TypeScript**, **Express 5**, and an in-memory data store, with a layered architecture (controller → service → repository) wired together through manual dependency injection.

---

## Scope and Design Philosophy

This is a **simulation**, and it is deliberately kept simple and focused on the requirements.

To be explicit about what is intentionally **not** included:

- **No money movement.** Payments are tracked as records with a status lifecycle; no balances are debited or credited.
- **No double-entry ledger and no accounts.** There is a single `Transaction` concept, not a ledger of accounts and entries.
- **No external messaging (Kafka / queues).** Processing is simulated in-process.
- **No persistent database.** Storage is in-memory (a `Map`),

---

## Features

- **REST API** for creating, retrieving, and updating payments.
- **Asynchronous payment processing** via a background worker that picks up new payments and settles them out-of-band, so the API responds immediately.
- **Idempotent creation** — repeated requests with the same `reference` return the original payment instead of creating a duplicate.
- **Status state machine** — only valid status transitions are allowed (e.g. a `completed` payment may be `reversed`, a `failed` one cannot be revived).
- **Input validation** with Zod, returning structured `400` errors.
- **Consistent error handling** — typed HTTP exceptions and a global error handler with uniform response shapes and correct status codes.
- **Structured logging** with Winston (console in development and JSON files in production), redacting nothing sensitive by design since no secrets are stored.
- **Security middleware** — Helmet, CORS, and rate limiting.
- **OpenAPI / Swagger documentation** served from the running app.
- **Unit tests** (Jest) covering the service, repository, and background processor.
- **Dockerized** with a multi-stage build and a Docker Compose setup.

---

## Getting Started

### Prerequisites

- **Node.js 22+** and npm (for running locally), **or**
- **Docker** and **Docker Compose** (to run without a local Node install).

### Environment

Copy the example environment file and adjust if needed:

```bash
cp .env.example .env
```

| Variable           | Default                 | Description                             |
| ------------------ | ----------------------- | --------------------------------------- |
| `NODE_ENV`         | `development`           | Runtime environment                     |
| `PORT`             | `3000`                  | Port the server listens on (`.env.example` uses `8000`) |
| `CLIENT_URL`       | `http://localhost:3000` | Allowed CORS origin(s), comma-separated |
| `LOG_LEVEL`        | `info`                  | Winston log level                       |
| `LOG_DIRECTORY`    | `logs`                  | Directory for log files                 |
| `API_DOCS_ENABLED` | `true`                  | Toggle Swagger docs                     |

---

### Run Locally

```bash
# install dependencies
npm install

# start in development (hot reload)
npm run dev

# OR build and run the compiled output
npm run build
npm start
```

### Run with Docker Compose

The simplest way to run the service without installing Node locally:

```bash
docker compose up --build
```

This builds the image and starts the service on port `8000` (as configured in `docker-compose.yml`). Logs are mounted to `./logs`. To stop:

```bash
docker compose down
```

---

## API Documentation

Once running, interactive Swagger documentation is available at:

```
http://localhost:<PORT>/docs
```

A health check is available at the root:

```
GET http://localhost:<PORT>/
```

---

## API Reference

All successful responses share a consistent envelope:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "...",
  "data": {}
}
```

### 1. Create a payment

```
POST /payments
```

Request body:

```json
{
  "reference": "order-12345",
  "type": "payment",
  "amount": 5000,
  "description": "Order #12345",
  "metadata": { "customerId": "cust_001" }
}
```

- `reference` (string, required) — unique identifier for the payment; also used as the idempotency key.
- `type` (string, required) — payment type.
- `amount` (number, required) — must be greater than zero.
- `description` (string, optional).
- `metadata` (object, optional).

Response — `201 Created`, payment starts in `pending`:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Created successfully",
  "data": {
    "id": "…",
    "reference": "order-12345",
    "type": "payment",
    "amount": 5000,
    "status": "pending",
    "description": "Order #12345",
    "metadata": { "customerId": "cust_001" },
    "createdAt": "…",
    "updatedAt": "…"
  }
}
```

Sending the same `reference` again returns the original payment. Sending the same `reference` with a **different** payload returns `409 Conflict` (idempotency mismatch).

### 2. Retrieve a payment by ID

```
GET /payments/:id
```

Response — `200 OK` with the payment, or `404 Not Found` if it does not exist. Poll this endpoint to observe the status transition from `pending` → `processing` → `completed` / `failed` as the background worker processes it.

### 3. Update a payment's status

```
PATCH /payments/:id
```

Request body:

```json
{ "status": "reversed" }
```

Response — `200 OK` with the updated payment. Returns `404` if the payment does not exist, `422` for invalid input, and `409 Conflict` if the requested transition is not allowed by the status state machine.

**Allowed status transitions:**

| From         | To                                  |
| ------------ | ----------------------------------- |
| `pending`    | `processing`, `completed`, `failed` |
| `processing` | `completed`, `failed`               |
| `completed`  | `reversed`                          |
| `failed`     | _(terminal)_                        |
| `reversed`   | _(terminal)_                        |

---

## How the Asynchronous Simulation Works

Creating a payment does not process it synchronously. Instead:

1. `POST /payments` validates the request, stores the payment as `pending`, records a "payment created" event, and **returns immediately**.
2. A background worker polls for new events and, for each, moves the payment to `processing`, then calls a **simulated payment provider**.
3. The simulated provider waits a randomized latency (mimicking a real gateway) and resolves the payment as `completed` or, with a small probability, `failed`.
4. The final status is persisted and logged. Clients observe the outcome by polling `GET /payments/:id`.

---

## Testing

```bash
npm test
```

The suite covers the transaction service (creation, idempotency, status transitions, processing outcomes), the in-memory repository, and the background processor.

---

## Project Structure

```
src/
├── app.ts                 # Express setup, middleware, server bootstrap
├── container.ts           # Composition root — dependency injection wiring
├── config/                # Environment parsing/validation (Zod)
├── controllers/           # HTTP handlers (thin — delegate to services)
├── services/              # Business logic + simulated payment provider
├── repositories/          # Repository interfaces + in-memory implementations
├── entities/              # Domain entities (Transaction)
├── dtos/                  # Request DTOs + validation schemas
├── constants/             # Status enum, transition rules, response messages
├── exceptions/            # Typed HTTP exceptions
├── middlewares/           # Global error handler, 404 handler
├── mappers/               # Entity → API response mapping
├── docs/                  # OpenAPI/Swagger registration
├── jobs/                  # Background processor
└── common/                # Logger, HTTP response helpers, idempotency, interfaces
tests/                     # Jest test suites
```
