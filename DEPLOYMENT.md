# 🚀 FloodGuard AI - Production Deployment Guide

This guide provides step-by-step instructions for deploying the **FloodGuard AI** application:
1. **Backend API** (FastAPI) on **Render**
2. **Frontend Dashboard** (React/Vite) on **Vercel**

---

## 📦 Prerequisites & Git LFS Configuration

The optimized machine learning model file (`backend/models/flood_model.pkl`) is **319.4 MB**. Because GitHub has a hard file size limit of 100 MB, you **must** use Git LFS (Large File Storage) to track and push this file.

1. **Install Git LFS** (if not already installed):
   ```bash
   git lfs install
   ```
2. **Verify `.gitattributes`**:
   The repository already contains a `.gitattributes` file configuring LFS tracking for `backend/models/*.pkl`.
3. **Commit and Push**:
   When you run `git push origin main`, Git LFS will automatically upload the large model file to LFS storage instead of the regular Git commit tree.

---

## ⚙️ Backend Deployment (Render)

We use Render's **Blueprint** specification to automatically configure and deploy the Python service.

1. **Log in to Render** and navigate to the dashboard at [dashboard.render.com](https://dashboard.render.com).
2. Click **New** > **Blueprint**.
3. Connect your GitHub/GitLab repository.
4. Render will detect the `render.yaml` file at the root. Click **Approve** to deploy the service.
5. Render will automatically:
   * Isolate the directory to `backend/` as the build root.
   * Pull the pinned dependencies from `backend/requirements.txt`.
   * Initialize a randomly generated `API_KEY` environment variable.
   * Start the service using `uvicorn main:app --host 0.0.0.0 --port $PORT`.
6. Once deployed, note down your backend's **Live URL** (e.g. `https://flood-guard-api.onrender.com`).
7. (Optional) In the Render dashboard, go to your service's **Environment** tab to view or change the `API_KEY` value.

---

## 🌐 Frontend Deployment (Vercel)

The React web application is deployed to Vercel directly from the `frontend/` directory.

1. **Log in to Vercel** and click **Add New** > **Project** at [vercel.com](https://vercel.com).
2. Import your Git repository.
3. In the project configuration:
   * **Framework Preset**: Select **Vite**.
   * **Root Directory**: Select **`frontend`** (click Edit, select the `frontend` folder).
   * **Build & Development Settings**: Keep defaults (`npm run build` / `dist`).
4. **Environment Variables**:
   Under the "Environment Variables" section, add the following:
   * **`VITE_API_URL`**: Set this to your Render backend Live URL (e.g. `https://flood-guard-api.onrender.com`).
   * **`VITE_API_KEY`**: Set this to the matching `API_KEY` configured in the backend environment variables.
5. Click **Deploy**. Vercel will build your static files and deploy them globally.

---

## 🔒 Security Summary

The API endpoints `/predict` and `/latest` are protected by header-based `X-API-Key` authentication:
* If the `API_KEY` environment variable is defined in the backend, the endpoint requires client requests to include the `X-API-Key` header.
* The React frontend automatically fetches the key from `import.meta.env.VITE_API_KEY` and appends it to all requests.
* For local development, if you don't define `API_KEY` in your backend env, the security checks automatically bypass to simplify debugging.
