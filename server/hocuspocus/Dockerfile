# ===========================================
# PlumeNote Hocuspocus Server Dockerfile
# ===========================================

# Stage 1: Install dependencies and build
FROM node:22-alpine AS builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Production runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hocuspocus

# Copy built files and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Switch to non-root user
USER hocuspocus

# Expose port
EXPOSE 1234

ENV PORT=1234

# Start the server
CMD ["node", "dist/index.js"]
