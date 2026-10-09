# Multi-stage Dockerfile for Vizio Remote Control
FROM node:26-alpine AS builder

RUN npm install -g corepack@latest
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./

# 1. Force pnpm v11 to allow native builds via workspace file injection
RUN echo "dangerouslyAllowAllBuilds: true" > pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Production runner stage
FROM node:26-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN npm install -g corepack@latest
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./

# 2. Inject the same build allowance for the production engine setup
RUN echo "dangerouslyAllowAllBuilds: true" > pnpm-workspace.yaml
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/types ./types

EXPOSE 3000

CMD ["node", "server/index.js"]
