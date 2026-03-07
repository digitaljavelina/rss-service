# Deployment Guide

## Docker Self-Hosted Deployment

### Prerequisites

- Docker and Docker Compose installed
- Git installed
- Port 3000 available (or configure a different port)

### Quick Start

```bash
# Clone the repo
git clone https://github.com/digitaljavelina/rss-service.git
cd rss-service

# Create environment file
cp .env.docker.example .env.docker

# Edit .env.docker and set a secure POSTGRES_PASSWORD
nano .env.docker

# Build and start
docker compose up --build -d

# Verify it's running
docker compose ps
curl http://localhost:3000/health
```

### Environment Configuration

Create `.env.docker` with the following variables:

```env
# Required: PostgreSQL password (change this!)
POSTGRES_PASSWORD=your_secure_password_here

# Optional: Base URL for feed links (defaults to http://localhost:3000)
BASE_URL=http://your-server-ip:3000

# Optional: Change the exposed port (defaults to 3000)
APP_PORT=3000
```

### Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f app

# Rebuild after code changes
docker compose up --build -d

# Full reset (removes all data!)
docker compose down -v
docker compose up --build -d
```

### Data Persistence

PostgreSQL data is stored in a Docker volume (`postgres_data`). Your feeds and items persist across container restarts and rebuilds.

To back up the database:
```bash
docker compose exec postgres pg_dump -U rssuser rssservice > backup.sql
```

To restore:
```bash
cat backup.sql | docker compose exec -T postgres psql -U rssuser rssservice
```

### Health Check

The app exposes a health endpoint:
```bash
curl http://localhost:3000/health
# Returns: {"status":"ok","db":"connected","uptime":...}
```

### Updating

```bash
cd /path/to/rss-service
git pull
docker compose up --build -d
```

---

## Architecture

| Component | Technology |
|-----------|-----------|
| Database | PostgreSQL (bundled via Docker Compose) |
| Cron | In-process (node-cron) |
| Browser | System Chromium (headless) |
