# ===========================================
# PlumeNote Hocuspocus Server Dockerfile
# Multi-stage build for production optimization
# ===========================================

# Stage 1: Install dependencies and build
FROM node:22-alpine AS builder
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package.json package-lock.json* ./

# Copy prisma schema (symlink target)
COPY prisma ./prisma

# Install dependencies (including devDependencies for build)
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy source code and config
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Production runner
FROM node:22-alpine AS runner
WORKDIR /app

# Install OpenSSL for Prisma runtime
RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 hocuspocus

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Copy Prisma generated client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Install production dependencies only
RUN npm install --omit=dev

# Switch to non-root user
USER hocuspocus

# Expose WebSocket port
EXPOSE 1234

# Environment variables with defaults
ENV PORT=1234
ENV LOG_LEVEL=info

# Health check endpoint (Hocuspocus responds to HTTP)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:1234 || exit 1

# Start the server
CMD ["node", "dist/index.js"]
