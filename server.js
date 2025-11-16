import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const HEALTH = { status: "ok", name: "youtube-converter-backend", version: "1.0.0" };
app.get("/", (req, res) => res.json(HEALTH));

// Extract YouTube ID
function extractVideoId(url) {
  try {
    url = url.trim();
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

    const u = new URL(url);
    if (u.searchParams.has("v")) return u.searchParams.get("v");
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
  } catch (e) {
    return null;
  }
  return null;
}

// Strong Piped mirrors
const SOURCES = [
  "https://pipedapi.in.projectsegfau.lt/streams/",
  "https://pipedapi.syncpundit.io/streams/",
  "https://pipedapi.fediverse.tv/streams/",
  "https://pipedapi.nosebs.com/streams/"
];

// Get Formats
app.post("/getFormats", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "url missing" });

    const id = extractVideoId(url);
    if (!id) return res.status(400).json({ error: "invalid YouTube url" });

    let data = null;

    for (const base of SOURCES) {
      try {
        const out = await axios.get(base + id, { timeout: 15000 });
        if (out?.data) {
          data = out.data;
          break;
        }
      } catch (e) {
        console.log("GETFORMATS FAILED:", base, e?.message || e);
      }
    }

    if (!data) return res.status(500).json({ error: "all servers failed" });

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: "failed to fetch formats" });
  }
});

// Download wrapper (fixes Android download)
app.post("/downloadFile", async (req, res) => {
  try {
    const { streamUrl, format } = req.body;

    if (!streamUrl) return res.status(400).json({ error: "streamUrl missing" });

    const fileName = `youtube.${format || "mp4"}`;

    const response = await axios({
      url: streamUrl,
      method: "GET",
      responseType: "stream"
    });

    res.setHeader("Content-Type", response.headers["content-type"] || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    response.data.pipe(res);

  } catch (err) {
    console.error("DOWNLOAD FILE ERROR:", err?.message || err);
    return res.status(500).json({ error: "download failed" });
  }
});

// Start
const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`youtube-converter-backend running on ${port}`));
