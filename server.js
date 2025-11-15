import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const HEALTH = { status: "ok", name: "youtube-converter-backend", version: "1.0.0" };
app.get("/", (req, res) => res.json(HEALTH));

/* Extract YouTube ID */
function extractVideoId(url) {
  const patterns = [
    /v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/shorts\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/
  ];

  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/* ⭐ Strong Piped API mirror list */
const SOURCES = [
  "https://pipedapi.in.projectsegfau.lt/streams/",
  "https://pipedapi.syncpundit.io/streams/",
  "https://pipedapi.fediverse.tv/streams/",
  "https://pipedapi.nosebs.com/streams/"
];

/* ⭐ GET FORMATS (with fallback) */
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
        data = out.data;
        break;
      } catch (e) {
        console.log("FAILED:", base);
      }
    }

    if (!data) return res.status(500).json({ error: "all servers failed" });

    return res.json(data);

  } catch (err) {
    return res.status(500).json({ error: "failed to fetch formats" });
  }
});

/* ⭐ DOWNLOAD (with fallback mirror support) */
app.post("/download", async (req, res) => {
  try {
    const { url, format } = req.body;

    if (!url || !format)
      return res.status(400).json({ error: "url or format missing" });

    const id = extractVideoId(url);
    if (!id) return res.status(400).json({ error: "invalid url" });

    let data = null;

    // 🔥 Try every Piped mirror
    for (const base of SOURCES) {
      try {
        const api = `${base}${id}`;
        const out = await axios.get(api, { timeout: 15000 });
        data = out.data;
        break;
      } catch (e) {
        console.log("DOWNLOAD FAILED:", base);
      }
    }

    if (!data) return res.status(500).json({ error: "all servers failed" });

    const all = [
      ...(data.audioStreams || []),
      ...(data.videoStreams || [])
    ];

    const selected = all.find(
      (x) => x.quality === format || x.mimeType?.includes(format)
    );

    if (!selected)
      return res.status(404).json({ error: "format not available" });

    return res.json({ downloadUrl: selected.url });

  } catch (err) {
    console.error("DOWNLOAD ERROR:", err.message);
    return res.status(500).json({ error: "download failed" });
  }
});

/* Server start */
const port = process.env.PORT;
if (!port) process.exit(1);

app.listen(port, () => console.log(`Server running on ${port}`));
