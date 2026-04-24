# Clarity Agentic App Seed - Monolithic Dockerfile
# Combines FastAPI backend + React frontend into a single container for Clarity Platform
#
# Architecture:
# - Nginx serves frontend static files and proxies /api/* to FastAPI
# - Supervisord manages both Nginx (port 3200) and FastAPI (port 8000)
# - Single container with multi-service architecture
#
# ⚠️ CRITICAL: Platform deploys ONLY ONE container per app
# - This Dockerfile is required for ECS deployment compatibility
# - DO NOT separate into multiple Dockerfiles
# - DO NOT modify unless you understand single-container ECS constraints

# ============================================================================
# Stage 1: Build Frontend (React + Vite)
# ============================================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package.json frontend/package-lock.json* ./

# Install frontend dependencies
RUN npm install

# Copy frontend source
COPY frontend/ ./

# Build frontend with relative API URLs
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ============================================================================
# Stage 2: Final Image (Nginx + Python + FastAPI)
# ============================================================================
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend requirements and install Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend source code
COPY backend/ ./backend/

# Copy built frontend files to Nginx directory
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy Nginx configuration
COPY frontend/nginx.conf /etc/nginx/sites-available/default
RUN ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default && \
    rm -f /etc/nginx/sites-enabled/default.conf

# Create supervisord configuration
RUN mkdir -p /var/log/supervisor

COPY <<'EOF' /etc/supervisor/conf.d/supervisord.conf
[supervisord]
nodaemon=true
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid

[program:backend]
command=python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
directory=/app
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/backend.err.log
stdout_logfile=/var/log/supervisor/backend.out.log

[program:nginx]
command=/usr/sbin/nginx -g "daemon off;"
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/nginx.err.log
stdout_logfile=/var/log/supervisor/nginx.out.log
EOF

# Expose port 3200 (Nginx - platform expects single port)
EXPOSE 3200

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3200/health || exit 1

# Start supervisord to manage both services
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
