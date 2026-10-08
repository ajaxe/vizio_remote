# Vizio SmartCast Remote Control: Detailed PRD & Technical Architecture

## 1. Executive Summary & Goals

### 1.1 Goal
Build an offline-capable, mobile-first web remote control application for Vizio SmartCast TVs based on the requirements in [`docs/prd/initial-requirements.md`](file:///home/asharma/code_workspace/vizio_remote/docs/prd/initial-requirements.md), enhanced with a high-performance Node.js backend bridge, Redis token persistence, and a polished Material Design user interface.

### 1.2 Core Capabilities
1. **Remote Navigation & Control**: Tactile 5-way D-Pad (Up, Down, Left, Right, OK), Volume rocker (+, -, Mute), and System buttons (Home, Back).
2. **App Launcher Row**: Smooth horizontal side-scrolling carousel displaying popular Vizio SmartCast streaming applications with direct one-tap launching on the TV.
3. **One-Time Pairing & Redis Token Storage**: Automatic 4-digit PIN pairing sequence with auth token persisted in Redis (`redis.internal.apogee-dev.com:6379`) keyed by TV IP, allowing persistent sessions across all client devices on the network.
4. **Pure JavaScript + JSDoc IntelliSense**: Zero TypeScript compilation friction. Both backend and frontend are written in modern JavaScript (`.js` and `.vue`), with full TypeScript type definitions (`types/index.d.ts`) and JSDoc annotations delivering complete IDE auto-completion.
5. **Mobile-First & Offline Resilience (PWA)**: Installable Progressive Web App (`manifest.json` and Service Worker) form-fitted for handheld smartphone use without cloud dependencies.

---

## 2. Technical Architecture & System Design

```mermaid
flowchart TD
    subgraph Client ["Client Device (Browser / Smartphone PWA - Pure JS)"]
        UI["Vue 3 + Vuetify 3 UI\n(D-Pad, Rockers, App Row)"]
        LS[("localStorage\n- vizio_tv_ip")]
        SW["Service Worker\n(Offline Assets Cache)"]
    end

    subgraph Server ["Node.js Backend Bridge (Port 3000 - Hono)"]
        HonoApp["Hono App Engine\n(@hono/node-server)"]
        API["Hono REST Routes\n(/api/status, /api/pair, /api/control, /api/apps)"]
        VSC["vizio-smart-cast Client"]
        RClient["Redis Client (ioredis)"]
    end

    subgraph Types ["TypeScript Definitions (types/index.d.ts)"]
        JSDoc["JSDoc IntelliSense & Type Annotations\n(jsconfig.json checkJs)"]
    end

    subgraph RedisStore ["Redis Instance (redis.internal.apogee-dev.com)"]
        RDB[("Key: vizio:token:<tv_ip>\nValue: <AUTH_TOKEN>\nTTL: Expiration / Indefinite")]
    end

    subgraph TV ["Vizio SmartCast TV (LAN)"]
        CastAPI["SmartCast REST Service\n(Port 7345 HTTPS)"]
    end

    UI <-->|JSON REST Requests| API
    UI <-->|Active TV IP| LS
    SW -.->|Cache Assets| UI
    HonoApp --> API
    API <-->|Get / Save Token| RClient
    RClient <-->|REDIS_URL (TCP 6379)| RDB
    API <-->|Send Commands| VSC
    VSC <-->|Local TLS Socket (Port 7345)| CastAPI
    JSDoc -.->|IntelliSense Types| Client
    JSDoc -.->|IntelliSense Types| Server
```

### 2.1 Why the Backend Bridge is Essential
Vizio SmartCast TVs listen on port `7345` over HTTPS using a self-signed TLS certificate. Browsers enforce security boundaries that prevent direct in-browser communication:
1. **Untrusted SSL / Self-Signed Cert**: Browsers block background `fetch()` requests with `net::ERR_CERT_AUTHORITY_INVALID` and will never prompt for certificate exceptions in programmatic requests.
2. **CORS Restrictions**: `PUT` requests with custom headers (`AUTH: <token>`, `Content-Type: application/json`) trigger an `OPTIONS` preflight, which the Vizio TV firmware does not answer with CORS headers.
3. **Private Network Access (PNA)**: Modern browsers restrict web applications from accessing local private IP subnets (`192.168.x.x`).
4. **Node Socket Runtime**: The `vizio-smart-cast` package requires Node.js `tls` and `net` sockets with `{ rejectUnauthorized: false }`.

The **Hono Node.js backend bridge** bypasses these constraints by executing the requests locally on the host/container network, while serving a seamless PWA web interface to any browser on the local Wi-Fi.

---

## 3. Technology Stack

| Layer | Technology | Justification & Role |
| :--- | :--- | :--- |
| **Backend Framework** | **Hono** (`@hono/node-server`) | Ultra-fast web-standard framework, native JSON handling, built-in CORS/logger, static asset serving, and zero-overhead `app.request()` testing. |
| **TV Protocol SDK** | **`vizio-smart-cast`** | Required npm package for device pairing, navigation, volume, keycodes, and app launches. |
| **Token Storage** | **Redis** via `ioredis` | Centralized token storage with `REDIS_URL` pointing to `redis://redis.internal.apogee-dev.com:6379`. |
| **Frontend Framework** | **Vue 3** (`<script setup>`) | Lightweight reactivity, clean component hierarchy, mobile-optimized state management. |
| **UI Component Library** | **Vuetify 3** + `@mdi/font` | Material Design 3 components: `v-btn` (ripples & elevations), `v-slide-group` (app row), `v-dialog` & `v-otp-input` (PIN pairing), dark theme. |
| **Language & Typing** | **Pure JavaScript + JSDoc** | Source code in `.js` and `.vue` files. `types/index.d.ts` and `jsconfig.json` (`checkJs: true`) provide full IDE IntelliSense. |
| **Build & Tooling** | **Vite** + **pnpm** | Fast HMR dev server, asset bundling, and deterministic dependency locking. |
| **Testing** | **Vitest** + `ioredis-mock` | Unit tests for backend routes, Redis store, Vizio service, and Vue components. |
| **Deployment** | **Docker** + `docker-compose` | Multi-stage production container image with parameterized environment variables. |

---

## 4. Repository Directory Structure

```
vizio_remote/
├── docs/
│   ├── prd/
│   │   ├── initial-requirements.md          # Original requirements document
│   │   └── initial-requirements-agentic.md  # Detailed technical PRD & architecture (this file)
│   └── architecture.md                      # Supplementary diagrams & notes
│
├── types/
│   └── index.d.ts                            # TypeScript domain definitions for JSDoc IntelliSense
│
├── jsconfig.json                             # IDE IntelliSense configuration (checkJs: true)
├── .env.example                              # Environment configuration template
├── .gitignore                                # Excluded files (node_modules, dist, .env)
├── .dockerignore                             # Docker context exclusions
├── Dockerfile                                # Multi-stage production container build
├── docker-compose.yml                        # Docker Compose configuration
├── package.json                              # pnpm scripts, dependencies, devDependencies
├── pnpm-lock.yaml                            # Deterministic package lockfile
├── vite.config.js                            # Vite build & development proxy configuration
├── vitest.config.js                          # Vitest unit test runner config
│
├── server/                                   # Hono Node.js backend bridge (Pure JS)
│   ├── index.js                              # Hono server bootstrap & static asset serving
│   ├── config.js                             # Environment configuration (PORT, REDIS_URL, etc.)
│   ├── redisClient.js                        # ioredis client instance & reconnection logic
│   ├── tokenStore.js                         # Redis token CRUD operations (vizio:token:*)
│   ├── vizioService.js                       # vizio-smart-cast wrapper & command dispatcher
│   ├── appsCatalog.js                        # Curated catalog of Vizio streaming applications
│   ├── routes/                               # Modular Hono sub-routers
│   │   ├── status.js                         # GET  /api/status?ip=... (checks Redis & TV state)
│   │   ├── pairing.js                        # POST /api/pair/initiate & POST /api/pair/confirm
│   │   ├── control.js                        # POST /api/control (D-Pad, volume, home, back)
│   │   └── apps.js                           # GET  /api/apps & POST /api/apps/launch
│   └── __tests__/                            # Backend automated test suite
│       ├── tokenStore.spec.js                # Redis token persistence tests (ioredis-mock)
│       ├── vizioService.spec.js              # Command mapping tests (mocked smartcast)
│       └── apiRoutes.spec.js                 # Direct Hono app.request() endpoint tests
│
└── client/                                   # Vue 3 + Vuetify 3 frontend application (Pure JS)
    ├── index.html                            # Viewport meta tags (no zoom, mobile-first)
    ├── public/                               # Static PWA assets
    │   ├── favicon.ico                       # Browser favicon
    │   ├── manifest.json                     # PWA Web App Manifest (standalone, theme colors)
    │   ├── sw.js                             # Service Worker for offline asset caching
    │   └── icons/                            # Remote app icon set (192x192, 512x512)
    └── src/
        ├── main.js                           # Vue app initialization & plugin registration
        ├── App.vue                           # Root component (viewport centering & snackbars)
        ├── plugins/
        │   └── vuetify.js                    # Vuetify 3 setup (dark theme, MDI icon set)
        ├── components/
        │   ├── RemoteShell.vue               # Handheld remote card container (glassmorphism)
        │   ├── StatusBar.vue                 # TV connection badge, IP chip, power button
        │   ├── DPad.vue                      # Circular 5-button D-Pad (Up/Down/Left/Right/OK)
        │   ├── VolumeRocker.vue              # Vertical Vol +, Vol -, and Mute button
        │   ├── SystemControls.vue            # Home (🏠) and Back (↩) buttons
        │   ├── AppCarousel.vue               # Side-scrollable app tray (v-slide-group)
        │   ├── PairingDialog.vue             # Pairing modal with IP input & v-otp-input PIN
        │   └── SettingsDialog.vue            # Settings modal to change IP or view Redis state
        ├── services/
        │   ├── api.js                        # Client API client for backend bridge
        │   └── storage.js                    # LocalStorage helper for active vizio_tv_ip
        ├── styles/
        │   └── main.css                      # Tactile press effects, custom animations
        └── __tests__/                        # Frontend component tests
            ├── DPad.spec.js                  # Tests D-Pad button click dispatches
            ├── AppCarousel.spec.js           # Tests app selection & scrolling
            └── PairingDialog.spec.js         # Tests PIN submission flow
```

---

## 5. Detailed Module Specifications

### 5.1 Environment Configuration (`server/config.js`)
Loaded from environment variables with fallback defaults:
- `PORT`: Server port (default: `3000`).
- `REDIS_URL`: Redis connection URI (default: `redis://redis.internal.apogee-dev.com:6379`).
- `TOKEN_TTL_SECONDS`: Redis token expiration in seconds (default: `0` / persistent indefinite token).
- `DEFAULT_TV_IP`: Optional fallback IP address for local discovery.

### 5.2 Redis Token Storage (`server/tokenStore.js`)
- **Key Schema**: `vizio:token:<tv_ip>` (e.g. `vizio:token:192.168.1.150`).
- **Functions**:
  - `getAuthToken(ip: string): Promise<string | null>`
  - `setAuthToken(ip: string, token: string, ttlSeconds?: number): Promise<void>`
  - `deleteAuthToken(ip: string): Promise<void>`

### 5.3 Vizio Service & Keycode Mapping (`server/vizioService.js`)
Wraps `vizio-smart-cast` and dispatches commands:

| Action Identifier | Remote Function | `vizio-smart-cast` Method | Underlying Protocol Mapping |
| :--- | :--- | :--- | :--- |
| `up` | Directional Up | `client.control.navigate.up()` | Codeset 3, Code 8 |
| `down` | Directional Down | `client.control.navigate.down()` | Codeset 3, Code 0 |
| `left` | Directional Left | `client.control.navigate.left()` | Codeset 3, Code 1 |
| `right` | Directional Right | `client.control.navigate.right()` | Codeset 3, Code 7 |
| `ok` | Select / OK | `client.control.navigate.ok()` | Codeset 3, Code 2 |
| `back` | Back / Return | `client.control.navigate.back()` | Codeset 4, Code 0 |
| `home` | SmartCast Home | `client.control.keyCommand(4, 3)` | Codeset 4, Code 3 |
| `vol_up` | Volume + | `client.control.volume.up()` | Codeset 5, Code 1 |
| `vol_down` | Volume - | `client.control.volume.down()` | Codeset 5, Code 0 |
| `mute` | Mute Toggle | `client.control.volume.mute()` | Codeset 5, Code 4 |
| `power` | Power Toggle | `client.control.keyCommand(11, 2)` | Codeset 11, Code 2 |

### 5.4 Curated Applications Catalog (`server/appsCatalog.js`)
Pre-configured streaming applications with brand colors and identifiers:

| App Name | ID | App ID | NameSpace | Brand Hex |
| :--- | :--- | :--- | :--- | :--- |
| **Netflix** | `netflix` | `netflix` | 2 | `#E50914` |
| **YouTube** | `youtube` | `youtube` | 2 | `#FF0000` |
| **Prime Video** | `prime_video` | `amazon_prime` | 2 | `#00A8E1` |
| **Disney+** | `disney_plus` | `disney_plus` | 2 | `#113CCF` |
| **Hulu** | `hulu` | `hulu` | 2 | `#1CE783` |
| **Apple TV+** | `apple_tv` | `apple_tv` | 2 | `#1A1A1A` |
| **Max** | `max` | `hbo_max` | 2 | `#002BE7` |
| **Peacock** | `peacock` | `peacock` | 2 | `#111111` |
| **Paramount+** | `paramount_plus` | `paramount_plus` | 2 | `#0064FF` |
| **Tubi** | `tubi` | `tubi` | 2 | `#FA3200` |
| **Pluto TV** | `pluto_tv` | `pluto_tv` | 2 | `#FFDE00` |
| **WatchFree+** | `watchfree` | `watchfree` | 2 | `#FFD54A` |

---

## 6. REST API Endpoints Specification

### 6.1 `GET /api/status?ip=<tv_ip>`
- **Description**: Checks whether a valid auth token is saved in Redis for the specified TV IP.
- **Query Parameter**: `ip` (required).
- **Responses**:
  - `200 OK`: `{ "ip": "192.168.1.100", "paired": true }`
  - `200 OK`: `{ "ip": "192.168.1.100", "paired": false }`
  - `400 Bad Request`: `{ "error": "Missing TV IP query parameter" }`

### 6.2 `POST /api/pair/initiate`
- **Description**: Triggers pairing on the TV, causing the TV to display a 4-digit PIN on the screen.
- **Request Body**: `{ "ip": "192.168.1.100", "deviceName": "VizioWebRemote" }`
- **Responses**:
  - `200 OK`: `{ "STATUS": { "RESULT": "SUCCESS" }, "ITEM": { "PAIRING_REQ_TOKEN": 12345 } }`
  - `500 Internal Server Error`: `{ "error": "Pairing initiation failed" }`

### 6.3 `POST /api/pair/confirm`
- **Description**: Submits the 4-digit PIN shown on the TV. If successful, writes the received `AUTH_TOKEN` to Redis.
- **Request Body**: `{ "ip": "192.168.1.100", "pin": "1234", "pairingReqToken": 12345 }`
- **Responses**:
  - `200 OK`: `{ "STATUS": { "RESULT": "SUCCESS" }, "ITEM": { "AUTH_TOKEN": "..." } }`
  - `400 Bad Request`: `{ "error": "Missing IP or PIN" }`

### 6.4 `POST /api/control`
- **Description**: Sends a navigation, volume, or system command to the TV.
- **Request Body**: `{ "ip": "192.168.1.100", "action": "up" }`
- **Responses**:
  - `200 OK`: `{ "success": true }`
  - `401 Unauthorized`: `{ "error": "NO_AUTH_TOKEN" }` (signals frontend to open `PairingDialog`)
  - `500 Internal Server Error`: `{ "error": "Command failed" }`

### 6.5 `GET /api/apps`
- **Description**: Retrieves the list of available Vizio streaming applications.
- **Responses**: `200 OK`: `VizioApp[]`

### 6.6 `POST /api/apps/launch`
- **Description**: Launches a specific app on the Vizio TV.
- **Request Body**: `{ "ip": "192.168.1.100", "appId": "netflix", "nameSpace": 2 }`
- **Responses**:
  - `200 OK`: `{ "success": true }`
  - `401 Unauthorized`: `{ "error": "NO_AUTH_TOKEN" }`

---

## 7. Frontend User Interface & Experience

### 7.1 Viewport & Form Factor
- Designed specifically for smartphone viewports (`375px` to `430px` width) with vertical layout for one-handed thumb interaction.
- Centered on desktop displays within a sleek remote enclosure (`max-width: 420px`).
- Viewport lock: `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">`.

### 7.2 UI Wireframe

```
+---------------------------------------+
|  [VIZIO REMOTE]        (● Paired)     |
|  IP: 192.168.1.105        [⚙ Settings]|
+---------------------------------------+
|                                       |
|      [ 🏠 Home ]      [ ↩ Back ]      |
|                                       |
|                 ▲                     |
|            ◄   OK   ►                 |
|                 ▼                     |
|                                       |
|      [ + Vol ]        [ 🔇 Mute ]     |
|      [ - Vol ]                        |
|                                       |
+---------------------------------------+
| APPS                                  |
| [Netflix] [YouTube] [Prime] [Disney+] |
| <----------- side-scroll -----------> |
+---------------------------------------+
```

### 7.3 Haptic & Tactile Interactions
- **Vibration**: `navigator.vibrate?.(15)` on every button touch.
- **Visual Feedback**: Vuetify ripples and active CSS button depression (`transform: scale(0.95)`).
- **Side-Scrolling Carousel**: Built with `v-slide-group`, enabling touch swiping and scroll-snapping on mobile.

---

## 8. TypeScript Type Definitions & JSDoc Typing

### 8.1 `types/index.d.ts`
```typescript
export type RemoteCommand =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'ok'
  | 'back'
  | 'home'
  | 'vol_up'
  | 'vol_down'
  | 'mute'
  | 'power';

export interface VizioApp {
  id: string;
  name: string;
  appId: string;
  nameSpace: number;
  color: string;
}

export interface StatusResponse {
  ip: string;
  paired: boolean;
}

export interface PairingInitiateResponse {
  STATUS: {
    RESULT: 'SUCCESS' | 'BLOCKED' | 'FAILED';
    DETAIL?: string;
  };
  ITEM?: {
    PAIRING_REQ_TOKEN: number;
  };
}

export interface PairingConfirmResponse {
  STATUS: {
    RESULT: 'SUCCESS' | 'FAILED';
    DETAIL?: string;
  };
  ITEM?: {
    AUTH_TOKEN: string;
  };
}
```

### 8.2 `jsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "checkJs": true,
    "allowJs": true,
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["client/src/*"],
      "@server/*": ["server/*"],
      "@types/*": ["types/*"]
    }
  },
  "include": [
    "server/**/*.js",
    "client/src/**/*.js",
    "client/src/**/*.vue",
    "types/**/*.d.ts"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

---

## 9. Verification & Quality Assurance Plan

### 9.1 Automated Tests
1. **Type Checking**:
   ```bash
   pnpm run typecheck # validates JSDoc against types/index.d.ts without emitting output
   ```
2. **Server Tests (Vitest + ioredis-mock)**:
   - `tokenStore.spec.js`: Validate token read, write, and delete operations against mock Redis.
   - `vizioService.spec.js`: Validate that all 11 commands trigger expected methods on `vizio-smart-cast`.
   - `apiRoutes.spec.js`: Execute Hono `app.request()` tests for `/api/status`, `/api/pair/*`, `/api/control`, and `/api/apps`.
3. **Frontend Tests (Vitest + @vue/test-utils)**:
   - `DPad.spec.js`: Verify button click emissions for D-Pad directions.
   - `AppCarousel.spec.js`: Verify rendering of 12 apps and emit on click.
   - `PairingDialog.spec.js`: Verify PIN input validation and submit events.
4. **Execution Command**:
   ```bash
   pnpm test
   ```

### 9.2 Manual Verification Checklist
1. **Tooling & Build**: Verify `node -v` (>= 18) and `pnpm -v`. Run `pnpm install` and `pnpm dev`.
2. **Hono Server**: Verify server starts cleanly on port 3000 and connects to Redis (`redis.internal.apogee-dev.com:6379`).
3. **Pairing Sequence**:
   - Empty state: Confirm `PairingDialog` opens automatically.
   - Enter TV IP & submit: Confirm PIN challenge appears.
   - Enter 4-digit PIN: Confirm token saves in Redis key `vizio:token:<ip>` and UI transitions to "Paired".
4. **Remote Operations**:
   - D-Pad navigation (Up, Down, Left, Right, OK).
   - Volume control (Vol +, Vol -, Mute).
   - System controls (Home, Back).
   - App Launcher (Click Netflix / YouTube card and confirm app launch request).
5. **Docker Container**: Build and run with `docker-compose up --build`. Confirm container serves web app and reaches Redis.
