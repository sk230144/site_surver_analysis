# 🚀 Deployment Checklist

Use this quick checklist to deploy your Solar AI Platform.

## ✅ Pre-Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] GitHub repository is public or accessible
- [ ] Vercel account created
- [ ] Render account created
- [ ] Google Gemini API key obtained (optional)

---

## 📦 Backend Deployment (Render)

- [ ] Go to Render Dashboard
- [ ] Click "New +" → "Blueprint"
- [ ] Connect GitHub repository
- [ ] Select repository and apply blueprint
- [ ] Wait for all services to deploy (PostgreSQL, Redis, Backend, Worker)
- [ ] Add `GEMINI_API_KEY` environment variable to backend service
- [ ] Open backend Shell and run: `alembic upgrade head`
- [ ] Copy backend URL (e.g., `https://solar-ai-backend.onrender.com`)
- [ ] Test backend health: Visit `/health` endpoint

---

## 🌐 Frontend Deployment (Vercel)

- [ ] Go to Vercel Dashboard
- [ ] Click "Add New..." → "Project"
- [ ] Import GitHub repository
- [ ] Set Root Directory: `frontend`
- [ ] Add environment variable:
  - `NEXT_PUBLIC_API_URL` = Your Render backend URL
- [ ] Click "Deploy"
- [ ] Wait for deployment to complete
- [ ] Copy frontend URL (e.g., `https://solar-ai-platform.vercel.app`)

---

## 🔄 Post-Deployment Configuration

- [ ] Go to Render backend service
- [ ] Update `CORS_ORIGINS` environment variable:
  - Add your Vercel URL: `https://your-app.vercel.app,http://localhost:3000`
- [ ] Save and wait for auto-redeploy
- [ ] Visit your frontend URL
- [ ] Test complete workflow:
  - [ ] Create new project
  - [ ] Upload geometry image
  - [ ] Generate panel layout
  - [ ] Create report

---

## 🎉 Deployment Complete!

**Your URLs:**
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.onrender.com`

---

## 📌 Important Notes

- **First request may be slow** - Render free tier sleeps after 15 min inactivity
- **Auto-deploy enabled** - Push to GitHub = automatic deployment
- **Check logs** if something goes wrong:
  - Render: Dashboard → Service → Logs
  - Vercel: Dashboard → Project → Deployments

---

## 🔧 Common Issues

| Issue | Solution |
|-------|----------|
| CORS error | Update `CORS_ORIGINS` with Vercel URL |
| Backend not responding | Check if it's sleeping, wait 30-60s |
| Database error | Run migrations: `alembic upgrade head` |
| Frontend can't connect | Verify `NEXT_PUBLIC_API_URL` is correct |

---

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)
