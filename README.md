# Vizio SmartCast Remote Control

A modern, responsive, offline-capable web remote control for Vizio SmartCast TVs built with **Vue 3**, **Vuetify 3**, **Hono** (`@hono/node-server`), **`pnpm`**, **`vizio-smart-cast`**, and **Redis** for auth token persistence.

---

## Features

- **Ergonomic Tactile Remote**: 5-way D-Pad (Up, Down, Left, Right, OK), Volume Rocker (+, -, Mute), and System Navigation (Home, Back) with haptic vibration feedback.
- **Side-Scrollable App Carousel**: Direct one-tap launcher for Netflix, YouTube, Prime Video, Disney+, Hulu, Apple TV+, Max, Peacock, Paramount+, Tubi, Pluto TV, and WatchFree+.
- **Redis Token Persistence**: Auth tokens are stored centrally in Redis via `REDIS_URL` (defaulting to `redis://redis.internal.apogee-dev.com:6379`), so every device on your home network connects immediately without re-pairing.
- **Progressive Web App (PWA)**: Installable to your phone's home screen for a fullscreen native experience, backed by a Service Worker for offline asset caching.
- **Pure JavaScript + JSDoc IntelliSense**: Zero TypeScript build friction, with complete IDE autocomplete and type safety provided by `types/index.d.ts` and `jsconfig.json`.
- **Docker Ready**: Multi-stage `Dockerfile` and `docker-compose.yml` for single-command container deployment.

---

## Prerequisites

- **Node.js**: v18+ (v20+ recommended)
- **pnpm**: Fast, disk space efficient package manager
- **Redis**: Running instance accessible via `REDIS_URL`

To install `pnpm` on your system:
```bash
npm install -g pnpm
# or
corepack enable && corepack prepare pnpm@latest --activate
```

---

## Quick Start (Local Development)

1. **Clone & Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Configure Environment** (optional):
   ```bash
   cp .env.example .env
   ```

3. **Start Development Servers**:
   ```bash
   pnpm dev
   ```
   - **Frontend (Vite)**: `http://localhost:5173`
   - **Backend Bridge (Hono)**: `http://localhost:3000`

4. **Production Build & Run**:
   ```bash
   pnpm build
   pnpm start
   ```

---

## Docker Deployment

To build and run with Docker Compose:
```bash
docker-compose up --build -d
```
The remote will be accessible at `http://localhost:3000`.

---

## Initial Pairing Guide

1. Open the web app on your phone or computer.
2. Enter your Vizio TV's IP address.
   > *Tip: Find your TV IP in your Vizio TV Menu: Settings &rarr; Network &rarr; Network Information.*
3. Click **"Request PIN"**. A 4-digit PIN code will appear on your TV screen.
4. Enter the 4-digit PIN into the web remote and click **"Confirm & Pair"**.
5. The received auth token is saved in Redis under `vizio:token:<tv_ip>` and your remote is ready to use!

---

## Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port for the Hono backend server |
| `REDIS_URL` | `redis://redis.internal.apogee-dev.com:6379` | Redis connection URL |
| `TOKEN_TTL_SECONDS` | `0` | Token expiration in seconds (0 = persistent) |
| `DEFAULT_TV_IP` | `""` | Optional fallback TV IP address |

---

## Running Tests

```bash
# Run automated Vitest test suite
pnpm test

# Run JSDoc type checking via jsconfig.json
pnpm run typecheck
```
