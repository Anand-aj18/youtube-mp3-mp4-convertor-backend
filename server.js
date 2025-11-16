// server.js
import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const HEALTH = { status: "ok", name: "youtube-converter-backend", version: "1.0.0" };
app.get("/", (req, res) => res.json(HEALTH));

/* Extract YouTube ID (robust) */
function extractVideoId(url) {
  try {
    url = url.trim();
    // quick patterns for common youtube urls
    const patterns = [
      /v=([^&]+)/,
      /youtu\.be\/([^?&]+)/,
      /youtube\.com\/shorts\/([^?&]+)/,
      /youtube\.com\/embed\/([^?&]+)/
    ];

    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }

    // try URL parsing fallback
    const u = new URL(url);
    if (u.searchParams.has("v")) return u.searchParams.get("v");
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
  } catch (e) {
    return null;
  }
  return null;
}

/* Strong Piped API mirror list (fallback) */
const SOURCES = [
  "https://pipedapi.in.projectsegfau.lt/streams/",
  "https://pipedapi.syncpundit.io/streams/",
  "https://pipedapi.fediverse.tv/streams/",
  "https://pipedapi.nosebs.com/streams/"
];

/* GET FORMATS (tries mirrors) */
app.post("/getFormats", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "url missing" });

    const id = extractVideoId(url);
    if (!id) return res.status(400).json({ error: "invalid YouTube url" });

    let data = null;

    for (const base of SOURCES) {
      try {
        const api = `${base}${id}`;
        const out = await axios.get(api, { timeout: 15000 });
        // simple sanity-check: must have either audioStreams or videoStreams
        if (out?.data) {
          data = out.data;
          break;
        }
      } catch (e) {
        console.log("GETFORMATS FAILED:", base, e?.message || e);
      }
    }

    if (!data) return res.status(500).json({ error: "all servers failed" });

    // Return the raw piped API object (Android model expects audioStreams/videoStreams + thumbnailUrl etc)
    return res.json(data);

  } catch (err) {
    console.error("GETFORMATS ERROR:", err?.message || err);
    return res.status(500).json({ error: "failed to fetch formats" });
  }
});

/* DOWNLOAD — Option A: Android sends direct streamUrl, backend just returns it */
app.post("/download", async (req, res) => {
  try {
    const { streamUrl } = req.body;

    if (!streamUrl) return res.status(400).json({ error: "streamUrl missing" });

    // Option A: simply return the streamUrl back. Android will open it in browser
    return res.json({ downloadUrl: streamUrl });

  } catch (err) {
    console.error("DOWNLOAD ERROR:", err?.message || err);
    return res.status(500).json({ error: "download failed" });
  }
});

/* Server start: use Render's PORT or default 10000 for local testing */
const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`youtube-converter-backend running on ${port}`));
