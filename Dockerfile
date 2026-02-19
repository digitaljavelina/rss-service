# Stage 1: Build TypeScript and CSS
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install dependencies (including devDeps for tsc)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Production runtime
FROM node:22-bookworm-slim

# Install system Chromium and required dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-cjk \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libfontconfig1 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled JS from builder
COPY --from=builder /app/dist ./dist

# Copy database migrations (SQL files not included in tsc output)
COPY src/db/migrations ./dist/db/migrations
RUN chmod -R 755 ./dist/db/migrations

# Copy static assets (CSS, JS, images referenced by express.static('public'))
COPY public ./public

# Create non-root user for security and set ownership
RUN groupadd -r pptruser && useradd -rm -g pptruser -G audio,video pptruser \
    && chown -R pptruser:pptruser /app
USER pptruser

# Environment configuration
ENV NODE_ENV=production
ENV PORT=3000
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

EXPOSE 3000

# Health check using inline Node.js (no curl dependency)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "const h=require('http');h.get('http://localhost:3000/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

CMD ["node", "dist/server.js"]
