# CI/CD Setup Guide

This document provides comprehensive instructions for setting up Continuous Integration and Continuous Deployment (CI/CD) for the Kids Progress application.

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [GitHub Actions CI/CD](#github-actions-cicd)
- [Docker Setup](#docker-setup)
- [Testing Strategy](#testing-strategy)
- [Deployment Options](#deployment-options)
- [Monitoring and Observability](#monitoring-and-observability)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## Overview

Our CI/CD pipeline includes:
- **Frontend**: React 19 + TypeScript + Vite with Vitest and Playwright
- **Backend**: Python FastAPI with pytest
- **Databases**: MongoDB + Qdrant
- **Testing**: Unit, Integration, and E2E tests
- **Security**: CodeQL analysis and vulnerability scanning
- **Deployment**: Docker containers with health checks

## Prerequisites

### Required Software
- Node.js 18+ and npm
- Python 3.11+
- Docker and Docker Compose
- Git

### Required Accounts/Services
- GitHub account (for CI/CD)
- OpenAI API account (for LLM functionality)
- MongoDB Atlas (optional, for production database)
- Domain and SSL certificate (for production)

### Required Secrets
Set up these GitHub secrets in your repository settings:

```
OPENAI_API_KEY=your_openai_api_key
PROD_API_URL=https://your-production-domain.com
MONGO_ROOT_USER=your_mongodb_username  
MONGO_ROOT_PASSWORD=your_mongodb_password
```

## Local Development Setup

### 1. Environment Configuration

Copy the environment template:
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
ENVIRONMENT=development
MONGODB_URL=mongodb://localhost:27017
QDRANT_URL=http://localhost:6333
OPENAI_API_KEY=your_openai_api_key_here
VITE_API_URL=http://localhost:8000
```

### 2. Install Dependencies

**Frontend:**
```bash
cd frontend
npm install
```

**Backend:**
```bash
cd backend
pip install -r requirements.txt
pip install -r requirements-test.txt
```

### 3. Start Development Services

**Option A: Using Docker Compose (Recommended)**
```bash
# Start databases only
docker-compose up mongodb qdrant -d

# Or start all services
docker-compose up -d
```

**Option B: Manual Setup**
```bash
# Terminal 1: Start MongoDB
mongod --dbpath /your/db/path

# Terminal 2: Start Qdrant
docker run -p 6333:6333 qdrant/qdrant:latest

# Terminal 3: Start Backend
cd backend && uvicorn main:app --reload

# Terminal 4: Start Frontend  
cd frontend && npm run dev
```

### 4. Run Tests Locally

**Frontend Tests:**
```bash
cd frontend

# Unit tests
npm run test

# Unit tests with coverage
npm run test:coverage

# E2E tests (requires backend running)
npm run test:e2e

# Linting and type checking
npm run lint
npx tsc --noEmit
```

**Backend Tests:**
```bash
cd backend

# All tests with coverage
pytest --cov=. --cov-report=html

# Unit tests only
pytest -m unit

# Integration tests only
pytest -m integration
```

## GitHub Actions CI/CD

### Pipeline Structure

Our CI/CD pipeline consists of 5 jobs:

1. **Frontend Tests** - Linting, type checking, unit tests with coverage
2. **Backend Tests** - Unit and integration tests with coverage  
3. **E2E Tests** - End-to-end testing with Playwright
4. **Security Scan** - CodeQL analysis and vulnerability scanning
5. **Build & Deploy** - Build artifacts and deploy (main branch only)

### Pipeline Triggers

- **Push to main/develop**: Full pipeline
- **Pull Request to main**: Tests only (no deployment)
- **Manual**: Can be triggered via GitHub UI

### Setting Up the Pipeline

1. **Enable GitHub Actions** in your repository settings

2. **Add required secrets** in Settings > Secrets and Variables > Actions:
   ```
   OPENAI_API_KEY
   PROD_API_URL
   MONGO_ROOT_USER
   MONGO_ROOT_PASSWORD
   ```

3. **Configure branch protection** (recommended):
   - Require status checks to pass
   - Require branches to be up to date
   - Require review before merging

### Viewing Pipeline Results

- **Actions tab**: View pipeline runs and logs
- **Security tab**: View CodeQL and vulnerability scan results  
- **Checks**: See status on PRs
- **Artifacts**: Download build outputs and test reports

## Docker Setup

### Development Environment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild containers
docker-compose up --build -d
```

### Production Environment

```bash
# Start with production profile
docker-compose --profile production up -d

# This includes Nginx reverse proxy
```

### Container Health Checks

All services include health checks:
- **Backend**: `GET /health`
- **Frontend**: `GET /` (via Nginx)
- **MongoDB**: `mongosh --eval "db.runCommand({ping: 1})"`
- **Qdrant**: `GET /health`

## Testing Strategy

### Test Types

1. **Unit Tests**
   - Frontend: Vitest + React Testing Library
   - Backend: pytest with mocking
   - Target: Individual components/functions

2. **Integration Tests** 
   - Frontend: API integration with MSW
   - Backend: Database integration with test DB
   - Target: Component interactions

3. **E2E Tests**
   - Tool: Playwright
   - Coverage: Critical user journeys
   - Browsers: Chrome, Firefox, Safari, Mobile

### Test Data Management

- **Frontend**: MSW (Mock Service Worker) for API mocking
- **Backend**: pytest fixtures with factory-boy
- **E2E**: Test database with cleanup between tests

### Coverage Requirements

- **Frontend**: Minimum 80% line coverage
- **Backend**: Minimum 85% line coverage  
- **E2E**: Cover all critical user paths

## Deployment Options

### Option 1: Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml kidsprogress
```

### Option 2: Kubernetes

Create Kubernetes manifests:
```yaml
# Example deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kidsprogress-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: kidsprogress/backend:latest
        ports:
        - containerPort: 8000
```

### Option 3: Cloud Platforms

**AWS ECS/Fargate:**
- Use AWS CLI or CDK for deployment
- Configure ALB for load balancing
- Use RDS for MongoDB alternative

**Google Cloud Run:**
- Build images in Cloud Build
- Deploy with `gcloud run deploy`
- Use Cloud SQL for databases

**Azure Container Instances:**
- Use Azure CLI or ARM templates
- Configure Azure Load Balancer
- Use CosmosDB for MongoDB compatibility

## Monitoring and Observability

### Health Checks

All services expose health endpoints:
- **Backend**: `http://localhost:8000/health`
- **Frontend**: `http://localhost:5173/health`

### Logging

**Backend logging configuration:**
```python
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

**Frontend error tracking:**
```typescript
// Add to main.tsx for production error tracking
window.addEventListener('error', (e) => {
  console.error('Frontend error:', e.error);
});
```

### Metrics Collection

Consider integrating:
- **Prometheus** for metrics collection
- **Grafana** for dashboards  
- **Sentry** for error tracking
- **DataDog** or **New Relic** for APM

## Security Considerations

### Code Security

- **CodeQL** analysis in GitHub Actions
- **Trivy** vulnerability scanning
- **Dependabot** for dependency updates

### Runtime Security

- Non-root containers
- Security headers in Nginx
- Input validation and sanitization
- Rate limiting (implement as needed)

### Secrets Management

- Use GitHub Secrets for CI/CD
- Use Docker Secrets for production
- Rotate keys regularly
- Never commit secrets to version control

### Database Security

- Use authentication for MongoDB
- Enable SSL/TLS in production
- Regular backups
- Network isolation

## Troubleshooting

### Common Issues

**1. Tests failing in CI but passing locally**
```bash
# Check environment differences
npm run test -- --reporter=verbose
```

**2. Docker container not starting**
```bash
# Check container logs
docker logs <container_name>

# Check health status
docker inspect <container_name> | grep Health
```

**3. Database connection issues**
```bash
# Test MongoDB connection
mongosh mongodb://localhost:27017

# Test Qdrant connection
curl http://localhost:6333/health
```

**4. Frontend build failing**
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**5. Backend tests failing**
```bash
# Run with verbose output
pytest -v -s

# Check test database connection
pytest tests/test_database_connection.py -v
```

### Debug Commands

```bash
# View all running containers
docker ps -a

# Check container resource usage
docker stats

# View Docker Compose logs
docker-compose logs -f [service_name]

# Execute commands in container
docker exec -it <container> /bin/bash

# Check network connectivity
docker network ls
docker network inspect kidsprogress_kidsprogress-network
```

### Performance Issues

**Frontend:**
- Use React DevTools Profiler
- Check bundle size: `npm run build && npx bundlephobia`
- Monitor Core Web Vitals

**Backend:**
- Use `pytest-benchmark` for performance tests
- Monitor database query performance
- Profile with `py-spy` or `cProfile`

### Getting Help

1. **Documentation**: Check component-specific README files
2. **Logs**: Always check application and container logs first
3. **Issues**: Create GitHub issues with:
   - Environment details
   - Error messages
   - Steps to reproduce
   - Expected vs actual behavior

## Maintenance

### Regular Tasks

- **Weekly**: Review test coverage reports
- **Monthly**: Update dependencies (Dependabot PRs)
- **Quarterly**: Security audit and penetration testing
- **As needed**: Scale containers based on usage

### Backup Strategy

- **Database**: Daily automated backups
- **Code**: Version control with Git
- **Artifacts**: Store build artifacts for 30 days
- **Logs**: Retain logs for compliance requirements

This completes the comprehensive CI/CD setup guide. Follow these instructions to establish a robust development and deployment pipeline for the Kids Progress application.