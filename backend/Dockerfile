# Clarity Agentic App - Backend Dockerfile
# Python FastAPI application with AI agents

# Use full Python image which includes build tools (gcc, make, etc.)
# This avoids needing to install them separately and saves disk space during build
FROM python:3.11

# Set working directory
WORKDIR /app

# Copy backend requirements
COPY backend/requirements.txt ./backend/

# Upgrade pip and install dependencies with verbose output for better error messages
RUN pip install --upgrade pip setuptools wheel && \
    pip install --retries 3 --timeout 120 --no-cache-dir --verbose -r ./backend/requirements.txt

# Copy backend application code
COPY backend/ ./backend/

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check - use wget which is included in the base image
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8000/health || exit 1

# Run application using Python module syntax to preserve import paths
CMD ["python", "-m", "backend.main"]
