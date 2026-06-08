# 🚀 FloodGuard AI - Production Deployment Guide

This guide provides step-by-step instructions for deploying the **FloodGuard AI** application:
1. **Backend API** (FastAPI) on **Hugging Face Spaces**
2. **Frontend Dashboard** (React/Vite) on **Vercel**

---

## 📦 Prerequisites & Git LFS Configuration

The optimized machine learning model file (`backend/models/flood_model.pkl`) is **319.4 MB**. Because Hugging Face and GitHub have file size limits, you **must** use Git LFS (Large File Storage) to track and push this file.

1. **Install Git LFS** (if not already installed):
   ```bash
   git lfs install
   ```
2. **Verify `.gitattributes`**:
   The repository already contains a `.gitattributes` file configuring LFS tracking for `backend/models/*.pkl`.
3. **Commit and Push**:
   When pushing to GitHub or Hugging Face, Git LFS will automatically upload the large model file to LFS storage.

---

## ⚙️ Backend Deployment (Hugging Face Spaces)

We deploy the FastAPI backend using Hugging Face's **Docker SDK**, which reads the root [Dockerfile](file:///c:/Users/anshu/Documents/Codes/Flood%20detection/Dockerfile).

1. **Create a Space on Hugging Face**:
   * Go to [huggingface.co/spaces](https://huggingface.co/spaces) and click **Create new Space**.
   * Enter a **Space name** (e.g. `flood-guard-api`).
   * **License**: select your license (e.g. `mit`).
   * **SDK**: Select **Docker**.
   * **Template**: Select **Blank** (or custom).
   * **Space Hardware**: Choose the free **CPU basic** tier (or upgrade if desired).
   * **Visibility**: Public (or Private).
   * Click **Create Space**.
2. **Configure Security Key**:
   * Navigate to the **Settings** tab of your new Space.
   * Under the **Variables and secrets** section, click **New secret**.
   * Set **Name** to `API_KEY` and **Value** to a secure random string (this acts as the authentication key for prediction requests).
3. **Push Code to Hugging Face**:
   * Follow the Git instructions on your Hugging Face Space page to add the Hugging Face Space repository as a remote:
     ```bash
     git remote add hf https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME
     ```
   * Push your main branch to Hugging Face Spaces:
     ```bash
     git push -f hf main
     ```
   * *Hugging Face will automatically detect the YAML metadata in [README.md](file:///c:/Users/anshu/Documents/Codes/Flood%20detection/README.md), build the [Dockerfile](file:///c:/Users/anshu/Documents/Codes/Flood%20detection/Dockerfile), and expose the FastAPI app on port `7860`.*
4. Once the build finishes and shows **Running**, your backend live URL will be:
   `https://YOUR_USERNAME-YOUR_SPACE_NAME.hf.space` (e.g. `https://anshu-flood-guard-api.hf.space`).

---

## 🌐 Frontend Deployment (Vercel)

The React web application is deployed to Vercel directly from the `frontend/` directory.

1. **Log in to Vercel** and click **Add New** > **Project** at [vercel.com](https://vercel.com).
2. Import your Git repository (from GitHub).
3. In the project configuration:
   * **Framework Preset**: Select **Vite**.
   * **Root Directory**: Select **`frontend`** (click Edit, select the `frontend` folder).
   * **Build & Development Settings**: Keep defaults (`npm run build` / `dist`).
4. **Environment Variables**:
   Under the "Environment Variables" section, add the following:
   * **`VITE_API_URL`**: Set this to your Hugging Face Spaces live API URL (e.g. `https://anshu-flood-guard-api.hf.space`).
   * **`VITE_API_KEY`**: Set this to the matching `API_KEY` secret you configured in your Hugging Face Space settings.
5. Click **Deploy**. Vercel will build your static files and deploy them globally, utilizing [vercel.json](file:///c:/Users/anshu/Documents/Codes/Flood%20detection/frontend/vercel.json) to handle routing.

---

## 🔒 Security Summary

The API endpoints `/predict` and `/latest` are protected by header-based `X-API-Key` authentication:
* If the `API_KEY` environment secret is defined in your Hugging Face Space, the endpoint requires client requests to include the `X-API-Key` header.
* The React frontend automatically fetches the key from `import.meta.env.VITE_API_KEY` and appends it to all requests.
* For local development, if you don't define `API_KEY` locally, the security checks automatically bypass.
