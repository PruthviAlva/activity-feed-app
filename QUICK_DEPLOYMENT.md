# 🚀 Quick Deployment Checklist

> Complete step-by-step guide to deploy on Render (Backend) + Vercel (Frontend)

---

## ✅ GitHub - DONE! ✓

Your code is now at:
```
https://github.com/PruthviAlva/activity-feed-app
```

Commits:
- ✅ Initial commit (all source code)
- ✅ Deployment configurations

---

## 📌 STEP 1: Deploy Backend on Render (5-10 minutes)

### 1.1 Setup MongoDB Atlas

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up / Log in
3. Create Free Deployment:
   - Project → New Project
   - Build a Database → Free Tier
   - Choose region (closest to you)
   - Click "Create Deployment"

4. Create Database User:
   - Username: `asidev` (or your username)
   - Password: (generate strong password - **save it**)
   - Create User

5. Get Connection String:
   - Click "Connect"
   - Select "Drivers" → "Node.js"
   - Copy connection string
   
   **Format**: 
   ```
   mongodb+srv://asidev:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/activity-feed?retryWrites=true&w=majority
   ```

6. Whitelist Your IP:
   - Network Access → Add IP Address
   - Whitelist Entry: `0.0.0.0/0` (Allow all - for now)
   - Click Confirm

### 1.2 Deploy on Render

1. Go to https://dashboard.render.com/
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect Repository:
   - Select GitHub
   - Find `activity-feed-app`
   - Click "Connect"

5. Configure:
   ```
   Name: activity-feed-backend
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   Plan: Free
   Root Directory: backend
   ```

6. Add Environment Variables:
   - Click "Environment"
   - Add Variable:
     ```
     MONGODB_URI: mongodb+srv://asidev:PASSWORD@cluster0.xxxxx.mongodb.net/activity-feed?retryWrites=true&w=majority
     ```
   - Add Variable:
     ```
     NODE_ENV: production
     ```

7. Deploy:
   - Click "Create Web Service"
   - Wait 2-3 minutes for deployment
   - When done, you'll see: ✅ "live"

8. Copy Backend URL:
   ```
   https://activity-feed-backend.onrender.com
   (or whatever Render assigns)
   ```

### 1.3 Verify Backend

```bash
# Test health endpoint
curl https://activity-feed-backend.onrender.com/health

# Should return:
# {"status":"OK","timestamp":"...","message":"..."}
```

✅ **Backend Status**: Deployed

---

## 🎨 STEP 2: Deploy Frontend on Vercel (5-10 minutes)

### 2.1 Update Frontend Configuration

1. Open file: `frontend/.env.production`
2. Replace with your Render backend URL:
   ```
   VITE_API_URL=https://activity-feed-backend.onrender.com/api
   ```
3. Commit to GitHub:
   ```bash
   git add frontend/.env.production
   git commit -m "Update API endpoint for Vercel"
   git push origin main
   ```

### 2.2 Deploy on Vercel

1. Go to https://vercel.com/pruthvi-alvas-projects
2. Click "Add New..." → "Project"
3. Select "Import Git Repository":
   - Find `activity-feed-app`
   - Click "Import"

4. Configure:
   ```
   Project Name: activity-feed-app
   Framework: Vite
   Root Directory: frontend
   ```

5. Build Settings (Auto-detected):
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment: Node 18

6. Add Environment Variable:
   - Click "Environment Variables"
   - Add:
     ```
     Name: VITE_API_URL
     Value: https://activity-feed-backend.onrender.com/api
     ```
   - Check: Development, Preview, Production

7. Deploy:
   - Click "Deploy"
   - Wait 1-2 minutes
   - When done: ✅ "Ready"

8. Copy Frontend URL:
   ```
   https://activity-feed-app.vercel.app
   (Your custom domain provided by Vercel)
   ```

### 2.3 Verify Frontend

Open in browser:
```
https://activity-feed-app.vercel.app
```

✅ Verify it works:
- [ ] Page loads
- [ ] Can see "Create Activity" form
- [ ] Create a test activity
- [ ] Activity appears in list
- [ ] No errors in console (F12)

---

## 🎯 STEP 3: Test End-to-End

### 3.1 Create Test Activity

1. Open: https://activity-feed-app.vercel.app
2. Fill form:
   ```
   Tenant ID: tenant-1
   Actor ID: user-1
   Actor Name: Test User
   Type: create
   Entity ID: test-entity-1
   Description: This is a test activity
   ```
3. Click "Create Activity"
4. Should see optimistic update (pending badge)
5. After 2-3 seconds, should disappear and activity appears in list

### 3.2 Fetch Activities

1. Scroll down
2. More activities should auto-load (infinite scroll)
3. Try filtering by type (Create, Update, Delete, etc.)

### 3.3 Check API Directly

```bash
# Get activities
curl "https://activity-feed-backend.onrender.com/api/activities?tenantId=tenant-1&limit=20"

# Should return JSON with activities
```

---

## ✅ DEPLOYMENT COMPLETE!

You now have:

| Component | URL | Status |
|-----------|-----|--------|
| GitHub Repo | https://github.com/PruthviAlva/activity-feed-app | ✅ Live |
| Backend API | https://activity-feed-backend.onrender.com | ✅ Live |
| Frontend App | https://activity-feed-app.vercel.app | ✅ Live |
| MongoDB | Atlas (Free tier) | ✅ Live |

---

## 📋 For Google Form Submission

Fill the form with:

```
GitHub Repository:
https://github.com/PruthviAlva/activity-feed-app

Deployment URL:
https://activity-feed-app.vercel.app
(Frontend - users access this)

Backend API:
https://activity-feed-backend.onrender.com/api

README:
https://github.com/PruthviAlva/activity-feed-app/blob/main/README.md
```

---

## 🔄 Auto-Deploy Setup (Optional but Recommended)

### Render Auto-Deploy
1. Render Dashboard → Your Service
2. Settings → Auto-Deploy
3. Set to: "On push to `main` branch"

### Vercel Auto-Deploy
1. Vercel Dashboard → Project
2. Settings → Git
3. Auto-Deploy: Already enabled for `main` branch

**Now every GitHub push auto-deploys!** 🚀

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend won't start | Check MONGODB_URI in Render env vars |
| Frontend shows blank | Check VITE_API_URL in Vercel env vars |
| API calls fail | Open DevTools → Network → Check URL |
| CORS error | Backend needs to allow frontend URL |
| "Can't connect to DB" | Check MongoDB Atlas IP whitelist |
| "503 Service Unavailable" | Backend might still be deploying |

---

## 📚 Detailed Guides

For more information:
- **Render**: See `RENDER_DEPLOYMENT.md`
- **Vercel**: See `VERCEL_DEPLOYMENT.md`
- **System Design**: See `SYSTEM_DESIGN.md`
- **Performance**: See `PERFORMANCE_DEBUGGING.md`

---

## 🎉 You're Done!

Your complete Activity Feed application is now live and accessible to everyone:

- 🖥️ **Frontend**: https://activity-feed-app.vercel.app
- 🔌 **Backend API**: https://activity-feed-backend.onrender.com/api
- 💾 **Database**: MongoDB Atlas
- 📦 **Code**: https://github.com/PruthviAlva/activity-feed-app

**Total Deployment Time**: ~15-20 minutes

**Next Steps**:
1. Test the live application
2. Share the URL with others
3. Monitor deployment (Render & Vercel dashboards)
4. Make changes locally, push to GitHub → auto-deploys!

---

**Happy deploying! 🚀**
