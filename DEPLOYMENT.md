name: 🚀 Deployment Guide

## Table of Contents
1. [Local Development](#local-development)
2. [Heroku Deployment](#heroku-deployment)
3. [AWS Deployment](#aws-deployment)
4. [Railway.app Deployment](#railwayapp-deployment)
5. [Vercel + API Deployment](#vercel--api-deployment)

---

## Local Development

### Quick Start (5 minutes)

```bash
# Clone repository
git clone https://github.com/yourusername/activity-feed-app.git
cd activity-feed-app

# Backend
cd backend
npm install
cp .env.example .env
npm run dev
# Runs on http://localhost:5000

# Frontend (in new terminal)
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

### With Docker Compose

```bash
# Start all services
docker-compose up

# Services:
# - Backend: http://localhost:5000
# - Frontend: http://localhost:3000
# - MongoDB: localhost:27017
# - Redis: localhost:6379
```

---

## Heroku Deployment

### Prerequisites
- Heroku CLI installed
- MongoDB Atlas account (free tier available)
- GitHub account

### Backend Deployment

```bash
# Install Heroku CLI (if not done)
npm install -g heroku

# Login to Heroku
heroku login

# Create Heroku app
heroku create activity-feed-api

# Add MongoDB Atlas
heroku config:set MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/activity-feed

# Add Redis (optional)
heroku addons:create heroku-redis:premium-0

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### Frontend Deployment (Vercel - Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd frontend
vercel

# Configure environment variable
# Add VITE_API_URL in Vercel dashboard:
# Settings → Environment Variables
# https://your-heroku-api.herokuapp.com/api
```

---

## AWS Deployment

### Architecture
```
Route 53 (DNS)
    ↓
CloudFront (CDN)
    ↓
ALB (Load Balancer)
    ↓
ECS Fargate (Containers)
    ├── Backend Cluster
    ├── Frontend Cluster
    ↓
RDS (MongoDB/Postgres)
S3 (Static Files)
```

### Step 1: Prepare ECR Repositories

```bash
# Create ECR repository for backend
aws ecr create-repository --repository-name activity-feed-backend
aws ecr create-repository --repository-name activity-feed-frontend

# Get login token
aws ecr get-login-password --region us-east-1 | docker login \
  --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
```

### Step 2: Build and Push Images

```bash
# Backend
docker build -t activity-feed-backend ./backend
docker tag activity-feed-backend:latest \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/activity-feed-backend:latest
docker push \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/activity-feed-backend:latest

# Frontend
docker build -t activity-feed-frontend ./frontend
docker tag activity-feed-frontend:latest \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/activity-feed-frontend:latest
docker push \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/activity-feed-frontend:latest
```

### Step 3: Create ECS Task Definitions

```json
{
  "family": "activity-feed-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/activity-feed-backend:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "MONGODB_URI",
          "value": "mongodb+srv://..."
        },
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/activity-feed-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Step 4: Create ECS Service

```bash
aws ecs create-service \
  --cluster activity-feed \
  --service-name backend-service \
  --task-definition activity-feed-backend:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration \
    "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers \
    "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=backend,containerPort=5000"
```

---

## Railway.app Deployment

### Simplest Cloud Option

1. **Connect Repository**
   ```bash
   # Push code to GitHub
   git push origin main
   ```

2. **Create Railway Project**
   - Go to railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose activity-feed-app

3. **Add Services**
   - Add MongoDB service
   - Add Redis service (optional)
   - Railway auto-detects backend & frontend

4. **Configure Environment**
   ```
   MONGODB_URI=mongodb://...
   REDIS_URL=redis://...
   NODE_ENV=production
   ```

5. **Deploy**
   - Push to GitHub → Auto-deploys to Railway
   - View logs in Railway dashboard

---

## Vercel + API Deployment

### Frontend on Vercel (5 minutes)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel

# Add environment variable
# VITE_API_URL=https://api.yourdomain.com/api

# Set custom domain
# Settings → Domains → Add custom domain
```

### Backend on Vercel (Serverless Functions)

```bash
# Create vercel.json in backend
{
  "buildCommand": "npm install",
  "outputDirectory": ".",
  "functions": {
    "server.js": {
      "memory": 1024,
      "maxDuration": 60
    }
  }
}

# Deploy
vercel --prod
```

---

## Production Checklist

### Infrastructure
- [ ] Load balancer configured
- [ ] SSL/TLS certificates enabled
- [ ] Auto-scaling policies set
- [ ] Database replicas configured
- [ ] Redis cache running

### Security
- [ ] Environment variables set (no hardcoding)
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation active
- [ ] Secrets encrypted

### Monitoring
- [ ] Application logs setup
- [ ] Database monitoring enabled
- [ ] Performance metrics tracked
- [ ] Error alerts configured
- [ ] Uptime monitoring active

### Deployment
- [ ] CI/CD pipeline configured
- [ ] Health checks passing
- [ ] Database migrations applied
- [ ] Indexes created
- [ ] Backup strategy in place

### Performance
- [ ] API P95 latency < 100ms
- [ ] Frontend Lighthouse score > 90
- [ ] Database query efficiency > 90%
- [ ] Cache hit ratio > 95%

---

## DNS Configuration

### Point Domain to Deployment

**For Heroku:**
```
CNAME: yourdomain.com → activity-feed-api.herokuapp.com
```

**For AWS CloudFront:**
```
CNAME: yourdomain.com → d111111abcdef8.cloudfront.net
```

**For Railway/Vercel:**
```
CNAME: yourdomain.com → <railway|vercel>.app
```

---

## Troubleshooting

### "Connection refused" to MongoDB

```bash
# Check MongoDB is running
mongosh localhost:27017

# Check connection string
echo $MONGODB_URI

# Whitelist IP if using MongoDB Atlas
# MongoDB Atlas Dashboard → Network Access → Add IP
```

### Frontend can't reach backend API

```javascript
// Check VITE_API_URL in .env
echo $VITE_API_URL

// In browser console
fetch('/api/health')
  .then(r => r.json())
  .then(console.log)
```

### Deploy fails with "npm ERR"

```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try deployment again
```

---

## Database Backups

### MongoDB Atlas Backups (Automated)

```bash
# In MongoDB Atlas Console:
# 1. Go to Backups
# 2. Enable Continuous Backup
# 3. Set retention: 7 days

# Restore from backup
mongarestore --uri "mongodb+srv://..." --dir /backups/dump
```

### Manual Backup

```bash
# Backup
mongodump --uri "mongodb+srv://..." --out ./backups

# Restore
mongorestore --uri "mongodb+srv://..." ./backups
```

---

## Cost Optimization

### Monthly Cost Estimates

| Component | Provider | Cost |
|-----------|----------|------|
| Backend (2 instances) | Heroku | $50/mo |
| Frontend | Vercel | Free tier | 
| MongoDB (shared) | Atlas | Free tier |
| Redis | Railway | $5/mo |
| Domain | Namecheap | $9/yr |
| **Total** | - | ~$55/mo |

### Cost Reduction Strategies

1. Use free tier services for dev/staging
2. Scale down during low traffic
3. Use spot instances on AWS
4. Archive old data to S3

---

## Rollback Procedure

```bash
# Heroku
heroku releases
heroku rollback v123

# Docker
docker pull myregistry/app:v2.0.0
docker run myregistry/app:v2.0.0

# Git
git revert <commit-hash>
git push production main
```

---

## Support

For deployment issues:
1. Check logs: `docker-compose logs`
2. Review .env configuration
3. Verify database connectivity
4. Check firewall/security groups
5. Review service documentation

---

**Deployment is ready! Choose your platform and get live! 🚀**
