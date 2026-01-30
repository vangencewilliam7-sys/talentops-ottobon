# Docker Deployment Guide

## Prerequisites

- Docker installed (version 20.10+)
- Docker Compose installed (version 2.0+)
- Git installed

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd "Talent Ops"
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` and add your actual credentials:

```env
# Required: Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Required: Gemini API
GEMINI_API_KEY=your_gemini_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key

# Optional: Chatbot (if using)
VITE_CHATBOT_URL=http://localhost:8035

# Optional: EmailJS (if using)
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

### 3. Build the Docker Image

```bash
docker-compose build
```

This will:
- Install all dependencies
- Build the Vite application
- Create an optimized production image with Nginx

### 4. Start the Application

```bash
docker-compose up -d
```

The application will be available at: **http://localhost:3000**

### 5. Verify Deployment

Check container status:
```bash
docker-compose ps
```

View logs:
```bash
docker-compose logs -f talentops-app
```

Check health:
```bash
curl http://localhost:3000/health
```

## Managing the Application

### Stop the Application

```bash
docker-compose down
```

### Restart the Application

```bash
docker-compose restart
```

### Update the Application

After pulling new code:

```bash
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### View Logs

```bash
# All logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f talentops-app
```

## Troubleshooting

### Container won't start

1. Check logs:
   ```bash
   docker-compose logs talentops-app
   ```

2. Verify environment variables:
   ```bash
   docker-compose config
   ```

3. Rebuild without cache:
   ```bash
   docker-compose build --no-cache
   ```

### Port already in use

If port 3000 is already in use, edit `docker-compose.yml`:

```yaml
ports:
  - "8080:80"  # Change 3000 to any available port
```

### Application not loading

1. Check if container is running:
   ```bash
   docker-compose ps
   ```

2. Check health status:
   ```bash
   docker inspect talentops-app | grep -A 10 Health
   ```

3. Access container shell:
   ```bash
   docker exec -it talentops-app sh
   ```

### Environment variables not working

Ensure:
- `.env` file exists in the same directory as `docker-compose.yml`
- Variables are prefixed with `VITE_` for client-side access
- Container was restarted after changing `.env`

## Production Deployment

### Using Custom Domain

1. Update `nginx.conf`:
   ```nginx
   server_name yourdomain.com www.yourdomain.com;
   ```

2. Add SSL/TLS (recommended):
   - Use a reverse proxy like Traefik or Nginx Proxy Manager
   - Or add certbot to the container

### Environment-Specific Builds

For different environments:

```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

### Resource Limits

Add to `docker-compose.yml`:

```yaml
services:
  talentops-frontend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          memory: 256M
```

## Architecture

### Multi-Stage Build

1. **Stage 1 (deps)**: Installs production dependencies
2. **Stage 2 (builder)**: Builds the Vite application
3. **Stage 3 (production)**: Serves with Nginx

### Benefits

- Small final image size (~50MB)
- Fast builds with layer caching
- Secure (no source code in final image)
- Production-optimized Nginx configuration

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Verify configuration: `docker-compose config`
3. Review this guide's troubleshooting section
