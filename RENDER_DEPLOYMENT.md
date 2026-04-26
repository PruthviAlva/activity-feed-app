# Render Backend Deployment Guide

> Complete step-by-step guide to deploy Activity Feed Backend on Render.com

---

## 📋 Prerequisites

- GitHub account with code pushed (✅ Done)
- Render.com account (free tier available)
- MongoDB Atlas account (free tier available)

---

## 🚀 Step 1: Setup MongoDB Atlas

### Create MongoDB Atlas Database

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up / Log in
3. Click "Create Deployment"
4. Select **Free Tier** → Create
5. Choose region closest to your deployment
6. Click "Create Deployment"

### Get Connection String

1. In Atlas Dashboard → Deployments → Connect
2. Select "Drivers"
3. Copy connection string (looks like): `mongodb+srv://user:pass@cluster.mongodb.net/activity-feed?retryWrites=true&w=majority`
4. Replace `<username>` and `<password>` with your credentials

### Whitelist IP

1. Go to Network Access
2. Add IP Address:
   - Whitelist Entry: `0.0.0.0/0` (allows all IPs - for development)
   - **For Production**: Add only Render's IP range
3. Confirm

---

## 🎯 Step 2: Deploy on Render

### Option A: Using GitHub Integration (Recommended)

1. **Sign up on Render**
   - Go to https://dashboard.render.com/
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Select "Connect a repository"
   - Choose `activity-feed-app` repository
   - Select "GitHub" (if not already connected)

3. **Configure Service**
   ```
   Name: activity-feed-backend
   Root Directory: backend
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   Plan: Free (or pay-as-you-go)
   ```

4. **Add Environment Variables**
   - Click "Environment"
   - Add Variable:
     ```
     KEY: MONGODB_URI
     VALUE: mongodb+srv://your:pass@cluster.mongodb.net/activity-feed
     ```
   - Add Another:
     ```
     KEY: NODE_ENV
     VALUE: production
     ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (2-3 minutes)
   - Get URL: `https://activity-feed-backend.onrender.com`

### Option B: Using render.yaml (Infrastructure as Code)

1. **File already created**: `render.yaml` in root directory
2. **Update values**:
   - Replace `MONGODB_URI` with your Atlas connection string
3. **Upload to GitHub**:
   ```bash
   git add render.yaml
   git commit -m "Add Render deployment config"
   git push origin main
   ```
4. **Deploy on Render**:
   - Click "New +" → "Web Service"
   - Connect GitHub repo
   - Render auto-detects `render.yaml`
   - Click "Deploy"

---

## ✅ Step 3: Verify Backend Deployment

### Test Health Endpoint
```bash
curl https://activity-feed-backend.onrender.com/health
```

**Expected Response**:
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "message": "Activity Feed API is running"
}
```

### Test Activity Creation
```bash
curl -X POST https://activity-feed-backend.onrender.com/api/activities \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-1",
    "actorId": "user-1",
    "actorName": "Alice",
    "type": "create",
    "entityId": "post-1"
  }'
```

---

## 🔧 Step 4: Configure Auto-Deploy

1. In Render Dashboard → Activity Feed Backend Service
2. Settings → Auto-Deploy
   - Select "Yes"
   - Trigger: "On push to `main` branch"
3. Save

Now every push to `main` auto-deploys! 🎉

---

## 📊 Expected Result

After deployment:
- ✅ Backend running on: `https://activity-feed-backend.onrender.com`
- ✅ API endpoints accessible
- ✅ Database connected
- ✅ Logs visible in Render Dashboard
- ✅ Auto-deploys on GitHub push

---

## 🛠️ Troubleshooting

### Deployment Failed: "Build Error"

**Solution**:
1. Check logs in Render Dashboard
2. Verify Node version in `backend/package.json`
3. Ensure all dependencies are correct:
   ```bash
   cd backend
   npm install
   npm run dev  # Test locally first
   ```
4. Push to GitHub and retry

### Deployment Failed: "MongoDB Connection Error"

**Solution**:
1. Verify `MONGODB_URI` is correct
2. Check MongoDB Atlas IP whitelist
3. Add Render's IP to whitelist:
   - Get it from Render logs
   - OR whitelist `0.0.0.0/0` (less secure)
4. Test connection locally with same URI

### API Responds 502 Bad Gateway

**Solution**:
1. Check if service is still starting (can take 2-3 min)
2. Verify environment variables are set
3. Check logs: Render Dashboard → Logs
4. Restart service: Dashboard → Settings → Restart

### "Port Already in Use"

**Solution**:
1. Render auto-assigns PORT
2. Ensure `.env` doesn't hardcode port:
   ```
   PORT=5000  # ❌ Wrong
   PORT=${PORT}  # ✅ Right
   ```

---

## 📈 Monitoring & Logs

### View Logs
1. Render Dashboard → Service → Logs
2. Real-time logs appear
3. Filter by date/severity

### Set Alerts (Premium)
1. Settings → Notifications
2. Add email alerts for:
   - Deployment failed
   - High CPU usage
   - Service crash

### Monitor Performance
1. Metrics tab shows:
   - CPU usage
   - Memory usage
   - Request count
   - Response time

---

## 🚀 Next Steps

1. ✅ Backend deployed on Render
2. ⬜ Frontend deployed on Vercel (see VERCEL_DEPLOYMENT.md)
3. ⬜ Connect frontend to backend API
4. ⬜ Test end-to-end
5. ⬜ Monitor & scale

---

## Quick Reference

| Item | Value |
|------|-------|
| Backend URL | https://activity-feed-backend.onrender.com |
| Health Check | GET /health |
| API Base | https://activity-feed-backend.onrender.com/api |
| Database | MongoDB Atlas (Free tier) |
| Auto-deploy | Enabled on `main` branch |
| Plan | Free tier (auto-sleeps after 15 min inactivity) |

---

## Important Notes

⚠️ **Free Tier Limits**:
- Spins down after 15 min of inactivity
- First request after sleep takes 30-40 seconds
- Suitable for development/demo

✅ **For Production**:
- Upgrade to "Pro" plan (prevents spin-down)
- Enable automatic deployments
- Set up monitoring & alerts
- Use dedicated MongoDB instance

---

**Backend is now live! 🎉**
