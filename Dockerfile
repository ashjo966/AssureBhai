# Stage 1: Install dependencies
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build Next.js application
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production Runner
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Install and update ca-certificates and openssl to ensure trust store patches
# (distrusting compromised intermediate CAs such as eMudhra)
# and install Python 3, pip, and venv for PDF parsing
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
    python3 \
    python3-pip \
    python3-venv \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt ./
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Create non-root system user and group for hardened container execution
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js standalone build and static assets from builder stage with non-root ownership
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/src/data ./src/data
COPY --from=builder --chown=nextjs:nodejs /app/assurebhai_feedback.xlsx ./assurebhai_feedback.xlsx

# Ensure scratch and runtime temp directories exist with proper write permissions for nextjs user
RUN mkdir -p /app/scratch /tmp/assurebhai && \
    chown -R nextjs:nodejs /app/scratch /tmp/assurebhai

USER nextjs

EXPOSE 3000

# Bind to Railway's dynamic PORT environment variable on 0.0.0.0
CMD ["node", "server.js"]
