# Solar AI Platform - Free Deployment Guide

This guide will help you deploy the Solar AI Platform completely **free** using Vercel (frontend) and Render (backend).

## 📋 Prerequisites

- GitHub account
- Vercel account (sign up at https://vercel.com)
- Render account (sign up at https://render.com)
- Google Gemini API key (optional, for roof image analysis)

---

## 🔧 Step 1: Prepare Your Repository

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Ensure your repository is public** or grant access to Vercel and Render

---

## 🚀 Step 2: Deploy Backend to Render

### 2.1 Create Render Account
1. Go to https://render.com
2. Sign up with your GitHub account
3. Verify your email

### 2.2 Deploy Using render.yaml (Recommended)

1. **Go to Render Dashboard**
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Select the repository: `solar-ai-platform-starter-v2`
5. Render will automatically detect `backend/render.yaml`
6. Click **"Apply"**

This will automatically create:
- PostgreSQL database (free tier)
- Redis instance (free tier)
- FastAPI backend web service
- Celery worker service

### 2.3 Set Environment Variables

After deployment starts, go to each service and add:

**Backend Web Service** (`solar-ai-backend`):
1. Go to **Environment** tab
2. Add environment variable:
   - Key: `GEMINI_API_KEY`
   - Value: Your Google Gemini API key (get from https://makersuite.google.com/app/apikey)

**Note**: Other environment variables (DATABASE_URL, REDIS_URL, CORS_ORIGINS) are automatically configured by render.yaml

### 2.4 Run Database Migrations

1. Go to your backend service (`solar-ai-backend`)
2. Click **"Shell"** tab
3. Run migration command:
   ```bash
   alembic upgrade head
   ```

### 2.5 Get Your Backend URL

After deployment completes:
1. Go to your backend service
2. Copy the URL (e.g., `https://solar-ai-backend.onrender.com`)
3. **Save this URL** - you'll need it for frontend deployment

---

## 🌐 Step 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Account
1. Go to https://vercel.com
2. Sign up with your GitHub account

### 3.2 Import Project

1. Click **"Add New..."** → **"Project"**
2. Import your GitHub repository
3. Select `solar-ai-platform-starter-v2`

### 3.3 Configure Build Settings

Vercel should auto-detect Next.js. Ensure these settings:

- **Framework Preset**: Next.js
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 3.4 Add Environment Variables

In the **Environment Variables** section:

1. Add:
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: Your Render backend URL (e.g., `https://solar-ai-backend.onrender.com`)

2. Click **"Deploy"**

### 3.5 Get Your Frontend URL

After deployment:
1. Vercel will provide a URL (e.g., `https://solar-ai-platform.vercel.app`)
2. **Save this URL**

---

## 🔄 Step 4: Update CORS Configuration

### 4.1 Update Render Backend CORS

1. Go to Render Dashboard
2. Select your backend service (`solar-ai-backend`)
3. Go to **Environment** tab
4. Find `CORS_ORIGINS` variable
5. Update value to include your Vercel URL:
   ```
   https://solar-ai-platform.vercel.app,http://localhost:3000
   ```
   (Replace `solar-ai-platform.vercel.app` with your actual Vercel domain)
6. Click **"Save Changes"**
7. Service will auto-redeploy

### 4.2 Update Vercel Configuration (if needed)

1. Go to Vercel Dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Verify `NEXT_PUBLIC_API_URL` is correct
5. If you need to update, click **"Edit"** and save

---

## ✅ Step 5: Verify Deployment

1. **Visit your frontend URL** (e.g., `https://solar-ai-platform.vercel.app`)
2. **Test features**:
   - Create a new project
   - Upload geometry image
   - Generate layout
   - Create report

3. **Check backend health**:
   - Visit: `https://your-backend.onrender.com/health`
   - Should return: `{"ok": true}`

---

## 📝 Important Notes

### Free Tier Limitations

**Render Free Tier**:
- Backend goes to sleep after 15 minutes of inactivity
- First request after sleep will be slow (30-60 seconds)
- 750 hours/month free (enough for one service running 24/7)
- PostgreSQL database: 1GB storage
- Redis: 25MB storage

**Vercel Free Tier**:
- 100GB bandwidth/month
- Serverless functions: 100 hours/month
- Always active (no sleep)

### Custom Domain (Optional)

**Vercel**:
1. Go to project **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

**Render**:
1. Go to service settings → **Custom Domain**
2. Add your domain
3. Configure DNS

---

## 🐛 Troubleshooting

### Backend not responding
- Check Render logs: Dashboard → Service → Logs
- Verify DATABASE_URL is set correctly
- Run migrations: `alembic upgrade head`

### CORS errors
- Verify CORS_ORIGINS includes your Vercel domain
- Check browser console for exact error
- Ensure no trailing slashes in URLs

### Database connection errors
- Verify PostgreSQL service is running on Render
- Check DATABASE_URL format in environment variables
- Ensure migrations have been run

### Frontend can't connect to backend
- Verify NEXT_PUBLIC_API_URL is correct
- Check backend health endpoint
- Look for network errors in browser console

### Celery worker not processing tasks
- Check worker logs on Render
- Verify REDIS_URL is correct
- Ensure worker service is running

---

## 🔄 Updating Your Deployment

### Update Backend
1. Push changes to GitHub
2. Render auto-deploys on push (if enabled)
3. Or manually deploy from Render dashboard

### Update Frontend
1. Push changes to GitHub
2. Vercel auto-deploys on push
3. Or trigger manual deployment from Vercel dashboard

### Run New Migrations
1. Go to Render backend service → Shell
2. Run: `alembic upgrade head`

---

## 💡 Tips for Production

1. **Enable Auto-Deploy**:
   - Both Vercel and Render support auto-deploy from GitHub
   - Push to main branch = automatic deployment

2. **Monitor Logs**:
   - Render: Dashboard → Service → Logs
   - Vercel: Dashboard → Project → Deployments → View Logs

3. **Set Up Alerts**:
   - Render can send email alerts on service failures
   - Configure in service settings

4. **Backup Database**:
   - Render free tier doesn't include automatic backups
   - Consider periodic manual exports via Render shell

5. **Environment Variables**:
   - Never commit .env files to GitHub
   - Use .env.example as template
   - Set all secrets via platform dashboards

---

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)

---

## 🆘 Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review Render and Vercel logs
3. Verify all environment variables are set correctly
4. Ensure database migrations have been run

---

**Congratulations! Your Solar AI Platform is now live! 🎉**

Frontend: `https://your-app.vercel.app`
Backend: `https://your-backend.onrender.com`
