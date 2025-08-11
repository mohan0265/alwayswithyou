# Multi-stage build for AWY Server
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@8

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/schema/package.json ./packages/schema/
COPY packages/utils/package.json ./packages/utils/
COPY packages/ui/package.json ./packages/ui/
COPY apps/server/package.json ./apps/server/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Development stage
FROM base AS development

# Copy source code
COPY . .

# Build packages
RUN pnpm run build:packages

# Expose port
EXPOSE 3001

# Start development server
CMD ["pnpm", "--filter", "@awy/server", "run", "dev"]

# Build stage
FROM base AS build

# Copy source code
COPY . .

# Build packages and server
RUN pnpm run build:packages
RUN pnpm --filter "@awy/server" run build

# Production stage
FROM node:20-alpine AS production

# Install pnpm
RUN npm install -g pnpm@8

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S awy -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=awy:nodejs package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=awy:nodejs packages/schema/package.json ./packages/schema/
COPY --chown=awy:nodejs packages/utils/package.json ./packages/utils/
COPY --chown=awy:nodejs packages/ui/package.json ./packages/ui/
COPY --chown=awy:nodejs apps/server/package.json ./apps/server/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=build --chown=awy:nodejs /app/packages/schema/dist ./packages/schema/dist
COPY --from=build --chown=awy:nodejs /app/packages/utils/dist ./packages/utils/dist
COPY --from=build --chown=awy:nodejs /app/packages/ui/dist ./packages/ui/dist
COPY --from=build --chown=awy:nodejs /app/apps/server/dist ./apps/server/dist

# Create uploads directory
RUN mkdir -p /app/uploads && chown awy:nodejs /app/uploads

# Switch to non-root user
USER awy

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "apps/server/dist/index.js"]

