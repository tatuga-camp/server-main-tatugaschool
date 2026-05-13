# Stage 1: Build the application
FROM oven/bun:1-slim AS builder

WORKDIR /usr/src/app

# Copy package management files
COPY package*.json bun.lock* ./
COPY prisma ./prisma/

# Install all dependencies (including dev dependencies for building)
RUN bun install --ci

# Generate Prisma client
RUN bunx prisma generate

# Copy the rest of the application code
COPY . .

# Build the NestJS application
RUN bun run build

# Stage 2: Create the production image
FROM oven/bun:1-slim AS production

WORKDIR /usr/src/app

# Set environment variable to production
ENV NODE_ENV=production

# Copy package management files
COPY package*.json bun.lock* ./
COPY prisma ./prisma/

# Install only production dependencies and clear cache to reduce image size
RUN bun install --ci --production --no-cache && \
    rm -rf /root/.bun/install/cache

# Generate Prisma client
RUN bunx prisma generate && \
    rm -rf /root/.bun/install/cache

# Copy built application from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Change ownership to the non-root 'bun' user for better security
USER bun

# Start the server using the production build
CMD ["bun", "run", "start:prod"]
