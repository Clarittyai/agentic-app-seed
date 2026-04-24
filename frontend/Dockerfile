# Clarity Agentic App - Frontend Dockerfile
# React + Vite application

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# ⚠️ CRITICAL: VITE_API_URL must use relative paths (empty string) for production
# Frontend makes relative API calls like /api/widget which are proxied by Nginx to backend:8000
# DO NOT set this to http://localhost:* as it will break production deployments
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 3200

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost:3200/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
