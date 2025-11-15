# YouTube Converter Backend (Option A)

Simple Node.js/Express backend wrapper designed to proxy public YouTube conversion APIs.
This project is **intended for educational/demo use** and uses third-party public converters (e.g. y2mate.nu).

## Features
- POST `/getFormats` -> expects `{ "url": "https://youtube.com/..." }`
- POST `/download` -> expects `{ "id": "<videoId>" }` or `{ "url": "<videoUrl>" }`
- CORS enabled
- Ready to deploy on Render.com

## Quick Start (local)
1. Install Node 18+
2. `npm install`
3. `npm start`
4. Server runs on `http://localhost:3000`

## Deploy to Render.com
1. Push this repo to GitHub.
2. In Render dashboard, create a **Web Service**.
3. Connect the GitHub repository, choose branch.
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Deploy. The service will provide a public URL.

## Notes & Caveats
- This project proxies public converter APIs. Availability and behavior depend on those external services.
- If you need a fully self-hosted solution providing consistent results, use `yt-dlp` + `ffmpeg` on a VM or container (not available reliably on Render free tier).
- Respect YouTube's Terms of Service and copyright laws in your jurisdiction.

## Example Android integration (Volley)
```java
// POST to /getFormats
String backend = "https://your-app.onrender.com/getFormats";
JSONObject body = new JSONObject();
body.put("url", "https://www.youtube.com/watch?v=GV3HUDMQ-F8");
// send request...
```
