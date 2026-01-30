# Talent Ops - Docker Deployment

A comprehensive HR management system built with React, Vite, and Supabase.

## Quick Start with Docker

### Prerequisites
- Docker & Docker Compose installed
- Git installed

### Deploy in 3 Steps

1. **Clone and Configure**
   ```bash
   git clone <your-repo-url>
   cd "Talent Ops"
   cp .env.example .env
   # Edit .env with your credentials
   ```

2. **Build**
   ```bash
   docker-compose build
   ```

3. **Run**
   ```bash
   docker-compose up -d
   ```

Access the application at **http://localhost:3000**

## Documentation

- **[DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)** - Complete deployment guide
- **[.env.example](./.env.example)** - Environment variables template

## Architecture

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Deployment**: Docker + Nginx
- **AI Integration**: Google Gemini API

## Features

- Employee Management
- Payroll & Payslips
- Leave Management
- Task Tracking
- Performance Reviews
- Project Analytics
- AI-Powered Chatbot

## Tech Stack

- React 18.3
- TypeScript 5.8
- Vite 6.2
- Supabase 2.86
- TailwindCSS 3.4
- Framer Motion
- jsPDF
- Recharts

## Support

For deployment issues, see [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md#troubleshooting)

## License

Proprietary - All rights reserved
