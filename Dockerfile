FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install Python 3 and pip
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
COPY requirements.txt ./
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Copy Next.js standalone build and static assets
COPY public ./public
COPY .next/standalone ./
COPY .next/static ./.next/static
COPY scripts ./scripts
COPY src/data ./src/data

EXPOSE 3000

# Bind to Railway's dynamic PORT environment variable
CMD ["node", "server.js"]
