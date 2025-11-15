import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const HEALTH = { status: "ok", name: "youtube-converter-backend", version: "1.0.0" };
app.get("/", (req, res) => res.json(HEALTH));

/* ✔ Extract YouTube ID from any URL */
function extractVideoId(url) {
  const patterns = [
    /v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /shorts\/([^?&]+)/,
    /embed\/([^?&]+)/
  ];

  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/* ⭐ GET FORMATS */
app.post("/getFormats", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "url missing" });

    const id = extractVideoId(url);
    if (!id) return res.status(400).json({ error: "invalid YouTube url" });

    const api = `https://pipedapi.kavin.rocks/streams/${id}`;
    const out = await axios.get(api, { timeout: 15000 });

    const d = out.data;

    return res.json({
      title: d.title || "",
      description: d.description || "",
      thumbnailUrl: d.thumbnailUrl || "",
      audioStreams: d.audioStreams || [],
      videoStreams: d.videoStreams || []
    });

  } catch (err) {
    console.error("GETFORMATS ERROR:", err.message);
    return res.status(500).json({ error: "failed to fetch formats" });
  }
});

/* ⭐ DOWNLOAD: return direct stream URL */
app.post("/download", async (req, res) => {
  try {
    const { url, format } = req.body;

    if (!url || !format)
      return res.status(400).json({ error: "url or format missing" });

    const id = extractVideoId(url);
    if (!id) return res.status(400).json({ error: "invalid url" });

    const api = `https://pipedapi.kavin.rocks/streams/${id}`;
    const out = await axios.get(api, { timeout: 15000 });

    const all = [
      ...(out.data.audioStreams || []),
      ...(out.data.videoStreams || [])
    ];

    const selected =
      all.find((x) => x.quality === format || x.audioQuality === format);

    if (!selected)
      return res.status(404).json({ error: "format not available" });

    return res.json({ downloadUrl: selected.url });

  } catch (err) {
    console.error("DOWNLOAD ERROR:", err.message);
    return res.status(500).json({ error: "download failed" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on ${port}`));
