# Multi-stage build for AWY Admin Console
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
COPY apps/admin/package.json ./apps/admin/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Development stage
FROM base AS development

# Copy source code
COPY . .

# Build packages
RUN pnpm run build:packages

# Expose port
EXPOSE 3000

# Start development server
CMD ["pnpm", "--filter", "@awy/admin", "run", "dev", "--host"]

# Build stage
FROM base AS build

# Copy source code
COPY . .

# Build packages and admin console
RUN pnpm run build:packages
RUN pnpm --filter "@awy/admin" run build

# Production stage
FROM nginx:alpine AS production

# Copy nginx configuration
COPY apps/admin/nginx.conf /etc/nginx/nginx.conf

# Copy built admin console
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html

# Create nginx user and set permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

