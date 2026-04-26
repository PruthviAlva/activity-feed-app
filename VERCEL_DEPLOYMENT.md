# Vercel Frontend Deployment Guide

> Complete step-by-step guide to deploy Activity Feed Frontend on Vercel

---

## 📋 Prerequisites

- GitHub account with code pushed (✅ Done)
- Vercel account (free tier available)
- Backend already deployed on Render (copy the URL)

---

## 🚀 Step 1: Prepare Frontend

### Update Environment Variables

1. Edit `frontend/.env.production`:
   ```env
   VITE_API_URL=https://activity-feed-backend.onrender.com/api
   ```
   Replace with your actual Render backend URL

2. Commit changes:
   ```bash
   git add frontend/.env.production
   git commit -m "Configure frontend API endpoint"
   git push origin main
   ```

---

## 🎯 Step 2: Deploy on Vercel

### Option A: Using Vercel CLI (Fast)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```
   - Choose GitHub authentication
   - Authorize Vercel to access GitHub

3. **Deploy Frontend**
   ```bash
   cd frontend
   vercel --prod
   ```
   - Select project name: `activity-feed-app`
   - Connected to: `frontend`
   - Vercel detects Vite automatically
   - Wait for deployment complete (1-2 minutes)

4. **Get Production URL**
   ```
   ✓ Deployed to https://activity-feed-app.vercel.app
   ```

### Option B: Using Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard
   - Click "Add New..." → "Project"

2. **Import GitHub Repository**
   - Select "Git Repository"
   - Find `activity-feed-app`
   - Click "Import"

3. **Configure Project**
   ```
   Project Name: activity-feed-app
   Framework: Vite
   Root Directory: frontend
   ```

4. **Add Environment Variables**
   - Click "Environment Variables"
   - Add:
     ```
     Name: VITE_API_URL
     Value: https://activity-feed-backend.onrender.com/api
     ```
   - Check all environments (Development, Preview, Production)

5. **Deploy**
   - Click "Deploy"
   - Wait 1-2 minutes
   - URL: `https://activity-feed-app.vercel.app`

---

## ✅ Step 3: Verify Frontend Deployment

### Visit Live Application
```
https://activity-feed-app.vercel.app
```

### Test Features
1. ✅ Page loads
2. ✅ "Create Activity" form visible
3. ✅ Create a test activity
4. ✅ Activities list displays
5. ✅ Scroll triggers loading
6. ✅ Filter by type works
7. ✅ No console errors

---

## 🔧 Step 4: Configure Auto-Deploy

1. **In Vercel Dashboard**
   - Project → Settings
   - Git → Deployments
   - Vercel for Git: Enabled
   - Deploy on Push: `main` branch

2. **Now Every Push Auto-Deploys!**
   ```bash
   # Make a change
   git add .
   git commit -m "Feature: Add new activity type"
   git push origin main
   # Vercel auto-deploys in 30 seconds
   ```

---

## 📊 Expected Result

After deployment:
- ✅ Frontend running on: `https://activity-feed-app.vercel.app`
- ✅ Backend API connected: `https://activity-feed-backend.onrender.com/api`
- ✅ All features working
- ✅ Auto-deploys on GitHub push
- ✅ Instant preview URLs for PRs

---

## 🛠️ Troubleshooting

### Blue Screen / "Cannot GET /"

**Solution**:
1. Vercel detected wrong root directory
2. Fix:
   - Dashboard → Settings → Build & Development Settings
   - Root Directory: `frontend`
   - Save
   - Redeploy

### "VITE_API_URL is not defined"

**Solution**:
1. env variable not set in Vercel
2. Fix:
   - Dashboard → Settings → Environment Variables
   - Add `VITE_API_URL` with value
   - Redeploy

### CORS Error / "Failed to fetch API"

**Solution**:
1. Backend URL might be different
2. Check Render backend is running:
   ```bash
   curl https://your-backend.onrender.com/health
   ```
3. Update `VITE_API_URL` in Vercel settings
4. Redeploy

### "Failed to find a default build directory"

**Solution**:
1. Vite not detected
2. Fix:
   - Settings → Build & Development Settings
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Save & Redeploy

### Page Works but API Fails

**Check**:
1. Open browser DevTools (F12)
2. Network tab
3. Check API request URL
4. Should be: `https://activity-feed-backend.onrender.com/api/activities`
5. If different, update `VITE_API_URL` and redeploy

---

## 📈 Monitoring & Analytics

### View Deployments
1. Vercel Dashboard → Deployments
2. See history of all deployments
3. Click to see logs

### Performance Analytics
1. Dashboard → Analytics
2. View:
   - Core Web Vitals
   - Page performance
   - Response times

### Preview Deployments
1. Make a Pull Request
2. Vercel auto-creates preview URL
3. Test before merging to main
4. Preview URL shown in PR

---

## 🚀 Next Steps

1. ✅ Backend deployed on Render
2. ✅ Frontend deployed on Vercel
3. ✅ Connected end-to-end
4. ⬜ Monitor performance
5. ⬜ Setup error tracking (optional)

---

## Quick Reference

| Item | Value |
|------|-------|
| Frontend URL | https://activity-feed-app.vercel.app |
| Backend API | https://activity-feed-backend.onrender.com/api |
| GitHub Repo | https://github.com/PruthviAlva/activity-feed-app |
| Auto-deploy | Enabled on `main` branch |
| Environment | Production |
| Analytics | https://vercel.com/dashboard |

---

## Deployment URLs for Google Form

**Fill the Google Form with**:
```
GitHub Repo: https://github.com/PruthviAlva/activity-feed-app
Deployment URL (Frontend): https://activity-feed-app.vercel.app
Deployment URL (Backend): https://activity-feed-backend.onrender.com

README URL: https://github.com/PruthviAlva/activity-feed-app/blob/main/README.md
```

---

## Testing the Live Application

### Full End-to-End Test

1. **Open Frontend**
   ```
   https://activity-feed-app.vercel.app
   ```

2. **Create Activity**
   - Fill form:
     - Tenant ID: tenant-1
     - Actor Name: Test User
     - Type: create
     - Entity ID: test-entity
   - Click "Create Activity"
   - Should see optimistic update

3. **Fetch Activities**
   - Should load immediately from backend
   - Shows in activities list

4. **Infinite Scroll**
   - Scroll down
   - More activities load automatically

5. **Filter**
   - Click "Update", "Delete", etc.
   - List filters correctly

6. **Check Browser Console**
   - No errors
   - Network requests successful

---

## Important Notes

✅ **Free Tier Benefits**:
- Unlimited deployments
- Free SSL/TLS certificate
- Automatic HTTPS
- CDN bandwidth included
- Suitable for production

⚠️ **Limits**:
- Serverless function timeout: 60 seconds
- Cold start: 1-2 seconds on first request

🚀 **For Better Performance**:
- Upgrade to Pro plan
- Use edge functions
- Enable incremental static regeneration (ISR)
- Setup monitoring & error tracking

---

**Frontend is now live! 🎉**

**Full Application Ready at**: https://activity-feed-app.vercel.app
