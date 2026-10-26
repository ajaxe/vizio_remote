# AGENTS.md — Contextual Anchor for AI Coding Agents

## 1. Project Mission

**Vizio SmartCast Remote Control** (`vizio-remote`) is a mobile-first, offline-capable Progressive Web App (PWA) and Node.js backend bridge for controlling Vizio SmartCast televisions over a local network. It eliminates physical remote friction and browser TLS/CORS restrictions by pairing once via a 4-digit PIN, persisting credentials and MAC addresses centrally in **Redis**, and exposing low-latency navigation, power (Wake-on-LAN + SmartCast HTTPS), volume, and streaming app launch controls to any household device.

---

## 2. Tech Stack & Core Dependencies

| Layer | Technology | Version / Package | Role |
| :--- | :--- | :--- | :--- |
| **Runtime & Language** | **JavaScript (ES2022 ESM)** | Node.js `>=18` (`node:26-alpine` in Docker) | Pure `.js` & `.vue` source (`"type": "module"`), zero TypeScript build step |
| **Type System** | **TypeScript + JSDoc** | `typescript ^5.9.3` (`jsconfig.json`) | Static type-checking (`checkJs: true`) backed by `types/index.d.ts` |
| **Frontend Framework** | **Vue 3** | `vue ^3.5.43` | Reactive Composition API (`<script setup>`) single-page application |
| **UI Component Library** | **Vuetify** | `vuetify ^4.2.4`, `@mdi/font ^7.4.47` | Material Design dark-themed mobile shell, dialogs, snackbars, and icons |
| **Build Tool & Bundler** | **Vite** | `vite ^8.3.4`, `vite-plugin-vuetify ^2.1.3` | Frontend dev server (`:5173`), `/api` proxy, and production bundler (`dist/`) |
| **Backend Web Framework** | **Hono** | `hono ^4.13.13`, `@hono/node-server ^1.19.17` | Lightweight REST API bridge (`:3000`) and production static asset server |
| **TV Protocol Driver** | **vizio-smart-cast** | `vizio-smart-cast ^1.4.0` + native `dgram`/`https` | SmartCast TLS API client (port `7345`) + patched transitive `request@2.88.2` |
| **State & Persistence** | **Redis** | `ioredis ^5.11.1` | Centralized storage for active TV profile, auth tokens, and NIC MAC addresses |
| **Testing Framework** | **Vitest** | `vitest ^5.0.5`, `@vue/test-utils ^2.5.1`, `ioredis-mock` | Unit and integration testing across server routes, services, and Vue components |
| **Package Manager** | **pnpm** | `pnpm` (Corepack managed) | Strict lockfile management, vulnerability overrides, and `patchedDependencies` |

---

## 3. Architecture & Design Patterns

### 3.1 Client-Bridge-TV Topology
Vizio SmartCast TVs expose an local HTTPS REST server on **port `7345`** signed by a **self-signed TLS certificate** (`rejectUnauthorized: false`) and reject browser CORS preflight requests on `PUT` endpoints with custom `AUTH` headers.
- **Browser PWA (`client/`)**: Communicates exclusively with the local **Hono Backend Bridge** via standard JSON REST requests (`/api/*`). Caches static shell assets via Service Worker (`client/public/sw.js`) while bypassing `/api/` routes.
- **Hono Backend Bridge (`server/`)**: Translates HTTP JSON commands into SmartCast TLS socket operations via `vizio-smart-cast` and raw UDP **Wake-on-LAN (WoL)** broadcast packets (`dgram`).
- **Centralized Redis State (`server/tokenStore.js`)**: Stores the paired TV metadata so every smartphone or browser on the LAN shares the paired session immediately without re-pairing.

### 3.2 Core Design Patterns
- **Single-Active-Remote Redis Document (`vizio-remote:remotes`)**: The backend persists an array containing the active `TvRemoteData` object (`{ ip, mac, token, deviceId, deviceName, status }`) under the Redis key `vizio-remote:remotes` (prefixed by `APP_KEY_PREFIX = "vizio-remote"`). Legacy per-IP token helpers (`vizio-remote:token:<ip>`) also exist in `server/tokenStore.js`.
- **SmartCast Client Pool (`server/vizioService.js`)**: `getClient(ip, tokenOverride, tokenStore)` memoizes `smartcast` device instances in an in-memory `Map` keyed by `${ip}:${token}`.
- **Two-Stage Hybrid Power Sequence (`toggleOnOffVizioTv`)**:
  1. When powering on (`turnOn: true`), iterates over stored NIC MAC addresses (`rj45_mac_address`, `wlan_mac_address`) and broadcasts UDP **Wake-on-LAN (WoL)** magic packets (`255.255.255.255:9` and `:7`) to wake the TV network interface from deep standby.
  2. Executes `client.control.power.on()` / `off()` with a retry loop (`maxRetries = 5`, `retryDelayMs = 1500`).
- **Constructor / Parameter Dependency Injection for Testability**: Backend service functions (`getClient`, `confirmPairing`, `executeCommand`, `launchApp`, `getAuthToken`, `setCurrentTvRemote`) accept optional `tokenStore` or Redis `client` parameters defaulting to production singletons, enabling fast in-memory mocking with `vi.fn()` or `ioredis-mock`.
- **Pure JS + Ambient TypeScript Contracts**: Zero `.ts` source compilation. All domain contracts (`RemoteCommand`, `VizioApp`, `TvRemoteData`, `StatusResponse`, `JsonLogEntry`) are declared in `types/index.d.ts` and referenced via JSDoc `@param` / `@returns` / `@type {import('../types').*}` annotations.

---

## 4. Directory Mental Model

```text
vizio_remote/
├── client/                         # Frontend Vue 3 + Vuetify PWA (Vite root)
│   ├── index.html                  # App entry HTML + Service Worker registration
│   ├── public/
│   │   ├── manifest.json           # PWA manifest (standalone portrait dark mode)
│   │   └── sw.js                   # Offline cache-first Service Worker (skips /api/*)
│   └── src/
│       ├── main.js                 # Vue app bootstrap + Vuetify plugin registration
│       ├── App.vue                 # Root stateful controller (status, pairing, commands, toasts)
│       ├── components/             # Presentational & interactive remote UI widgets
│       │   ├── RemoteShell.vue     # Mobile remote chassis layout container (named slots)
│       │   ├── StatusBar.vue       # Connection pill, TV IP display, Power & Settings triggers
│       │   ├── DPad.vue            # 5-way directional circular navigation pad (up/down/left/right/ok)
│       │   ├── VolumeRocker.vue    # Vertical/horizontal volume (+/-) & mute controls
│       │   ├── SystemControls.vue  # Back & Home navigation actions
│       │   ├── AppCarousel.vue     # Horizontal side-scrolling streaming app launcher row
│       │   ├── PairingDialog.vue   # 2-step modal wizard (IP input -> 4-digit PIN confirmation)
│       │   └── SettingsDialog.vue  # Modal to switch TV IP, re-pair, or clear local state
│       ├── plugins/
│       │   └── vuetify.js          # Vuetify 4 dark theme palette & MDI icon configuration
│       ├── services/
│       │   ├── api.js              # Fetch wrappers for /api/* + navigator.vibrate() haptics
│       │   └── storage.js          # Safe localStorage wrapper for 'vizio_tv_ip'
│       ├── styles/
│       │   └── main.css            # Global dark remote surface styling & touch rules
│       └── __tests__/              # Frontend component & storage unit tests (*.spec.js)
├── server/                         # Backend Node.js Hono Bridge
│   ├── index.js                    # Hono app definition, middleware pipeline, static serving, server boot
│   ├── config.js                   # dotenv loader & typed ServerConfig export
│   ├── redisClient.js              # ioredis singleton with lazyConnect & exponential backoff
│   ├── tokenStore.js               # Redis CRUD for TvRemoteData ('vizio-remote:remotes') & tokens
│   ├── vizioService.js             # SmartCast SDK wrapper, MAC discovery, WoL UDP & HTTPS key commands
│   ├── appsCatalog.js              # Curated static catalog of 12 Vizio SmartCast apps (VIZIO_APPS)
│   ├── middleware/
│   │   └── logger.js               # Structured JSON HTTP middleware (jsonLogger) & serverLogger
│   ├── routes/
│   │   ├── status.js               # GET /api/status (returns paired state, active IP, and TV power state)
│   │   ├── pairing.js              # POST /api/pair/initiate & POST /api/pair/confirm
│   │   ├── control.js              # POST /api/control (dispatches RemoteCommand actions)
│   │   └── apps.js                 # GET /api/apps & POST /api/apps/launch
│   └── __tests__/                  # Backend unit & route tests (*.spec.js)
├── types/                          # Ambient TypeScript definitions for JSDoc type-checking
│   ├── index.d.ts                  # Shared domain interfaces, union types & module augmentations
│   └── shims-vue.d.ts              # '*.vue' DefineComponent declaration
├── patches/
│   └── request@2.88.2.patch        # Fixes legacy uuid/v4 deep require inside transitive request dep
├── docs/                           # Product requirement documents & sample SmartCast payloads
├── vite.config.js                  # Vite bundler config (root: 'client', outDir: '../dist', /api proxy)
├── vitest.config.js                # Vitest runner config (jsdom, vuetify inline deps, path aliases)
├── vitest.setup.js                 # Polyfills for ResizeObserver and Node 22+ localStorage in jsdom
└── jsconfig.json                   # TypeScript compiler config for JSDoc validation
```

---

## 5. Development Standards

### 5.1 Naming & File Conventions
- **Module System**: Strictly **ES Modules (`import` / `export`)**. Local relative imports in `server/` and `client/` **must include the explicit `.js` or `.vue` extension** (e.g., `import { config } from './config.js'`).
- **Path Aliases**: Configured in `jsconfig.json`, `vite.config.js`, and `vitest.config.js`:
  - `@/*` $\rightarrow$ `client/src/*`
  - `@server/*` $\rightarrow$ `server/*`
  - `@types/*` $\rightarrow$ `types/*`
- **File Naming**:
  - **Vue Components**: `PascalCase.vue` (`DPad.vue`, `AppCarousel.vue`, `PairingDialog.vue`).
  - **Server & Client Modules**: `camelCase.js` (`vizioService.js`, `tokenStore.js`, `appsCatalog.js`).
  - **Tests**: Co-located in `__tests__/*.spec.js` matching the target module name (`vizioService.spec.js`, `DPad.spec.js`).
- **Code Identifiers**:
  - Variables, functions, and methods: `camelCase`.
  - Constants & configuration keys: `UPPER_SNAKE_CASE` (`VIZIO_APPS`, `APP_KEY_PREFIX`, `STORAGE_KEY_IP`).
  - Remote command strings: lowercase `snake_case` matching the `RemoteCommand` union type in `types/index.d.ts` (`up`, `down`, `left`, `right`, `ok`, `back`, `home`, `vol_up`, `vol_down`, `mute`, `power_on`, `power_off`).

### 5.2 Error Handling & Logging Strategies
- **Structured JSON Logging (`server/middleware/logger.js`)**:
  - All HTTP requests are logged automatically by `jsonLogger()` middleware (`timestamp`, `level`, `method`, `path`, `status`, `durationMs`, `query`, `ip`, `userAgent`).
  - Application-level events and route errors **must** use `serverLogger.info(msg, meta)`, `serverLogger.warn(msg, meta)`, or `serverLogger.error(msg, meta)` so output remains single-line machine-parseable JSON.
- **Unpaired / Auth Token Error Contract (`NO_AUTH_TOKEN`)**:
  - When a TV command or app launch is attempted without a valid token, `vizioService.js` throws `new Error("NO_AUTH_TOKEN")`.
  - Route handlers (`server/routes/control.js`, `server/routes/apps.js`) catch `err.message === "NO_AUTH_TOKEN"` and return **HTTP `401`** with `{ error: "NO_AUTH_TOKEN", message: "TV is not paired" }`.
  - Client API helpers (`client/src/services/api.js`) attach `error.status = res.status` before throwing, allowing `App.vue` to detect `err.status === 401`, mark `isPaired.value = false`, and automatically open `PairingDialog.vue`.
- **Safe JSON Parsing in Hono Routes**: Always wrap `await c.req.json()` in a `try / catch` block returning `c.json({ error: 'Invalid JSON payload' }, 400)` on malformed request bodies.

### 5.3 Specific Implementation Patterns
- **Two-Phase TV Pairing & MAC Harvesting**:
  1. `POST /api/pair/initiate` generates a `deviceId = crypto.randomUUID()`, calls `initiatePairing(ip, deviceName, deviceId)`, and stores an initial `unpaired` `TvRemoteData` entry in Redis via `setCurrentTvRemote`.
  2. `POST /api/pair/confirm` verifies the pending IP against `getCurrentTvRemote()`, submits `pin`, `deviceId`, and `pairingReqToken` via `confirmPairing()`, queries the TV's network settings (`client.settings.system.information.network.get()`) to extract `rj45_mac_address` and `wlan_mac_address` (`T_MAC_ADDRESS_V1`), and updates Redis with `status: "paired"` and the `AUTH_TOKEN`.
- **App Launching (`launchApp` in `server/vizioService.js`)**:
  - Uses `client.app.launch(message, appId, nameSpace)` when present on the `vizio-smart-cast` instance, with a direct HTTPS `PUT https://${ip}:7345/app/launch` fallback.
- **Haptic Touch Feedback**:
  - Client remote actions in `client/src/services/api.js` trigger `navigator.vibrate(15)` (commands) or `navigator.vibrate(20)` (app launches) when supported by the mobile browser.

---

## 6. Hard Constraints & Anti-Patterns

1. **DO NOT introduce `.ts` or `.tsx` source files**: The codebase is strictly **Pure JavaScript + JSDoc** (`checkJs: true` in `jsconfig.json`). Add or update interfaces exclusively in `types/index.d.ts` and annotate `.js` files with JSDoc comments.
2. **DO NOT call the Vizio TV (`https://<tv_ip>:7345`) directly from `client/`**: Browsers block self-signed certificates and cross-origin `PUT` headers. All TV communication must route through the Hono backend (`/api/*`).
3. **DO NOT use `npm` or `yarn`**: Always use **`pnpm`**. Transitive dependencies (`request@2.88.2`, `uuid`, `tough-cookie`, `form-data`) rely on `pnpm-workspace.yaml` `overrides` and `patchedDependencies` (`patches/request@2.88.2.patch`) so `vizio-smart-cast` does not crash on Node 20+/26+ due to removed `uuid/v4` subpath exports.
4. **DO NOT remove `patches/request@2.88.2.patch` or `pnpm-workspace.yaml` overrides**: Removing the patch breaks `vizio-smart-cast` at runtime with `ERR_PACKAGE_PATH_NOT_EXPORTED` for `uuid/v4`.
5. **DO NOT cache `/api/*` responses in the Service Worker (`client/public/sw.js`)**: Status checks, pairing handshakes, and remote control commands must always hit the network live.
6. **DO NOT start the HTTP server or eager Redis connections when `NODE_ENV === 'test'`**: Both `server/index.js` and `server/redisClient.js` guard startup side effects behind `if (process.env.NODE_ENV !== 'test')` so Vitest can import `app` and test routes in-memory via `app.request()`.
7. **WATCH OUT for Redis Key & Route Contract Drift in Legacy Tests**:
   - `server/tokenStore.js` recently migrated from `vizio:token:<ip>` to `APP_KEY_PREFIX = "vizio-remote"` (`vizio-remote:token:<ip>` and `vizio-remote:remotes`), and `GET /api/status` + `POST /api/control` now read the active remote from `getCurrentTvRemote()` rather than requiring an `ip` query/body parameter. When updating or writing tests in `server/__tests__/`, verify alignment with `server/tokenStore.js` and `server/routes/*.js`.

---

## 7. Operational Commands

```bash
# Install dependencies (respecting pnpm overrides & patches)
pnpm install

# Start concurrent local development (Hono server on :3000 + Vite client on :5173)
pnpm dev

# Start backend or frontend individually
pnpm dev:server        # Runs: node server/index.js (http://localhost:3000)
pnpm dev:client        # Runs: vite (http://localhost:5173, proxies /api -> :3000)

# Run Vitest unit & integration test suite (single run)
pnpm test

# Run JSDoc + TypeScript static type validation (zero-emit)
pnpm run typecheck

# Build production frontend bundle into ./dist
pnpm build

# Run production server (serves API + static ./dist on :3000)
pnpm start

# Build local Docker image (multi-stage node:26-alpine)
pnpm docker:build

# Run containerized stack via Docker Compose
docker-compose up --build -d
```
