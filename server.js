import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const HEALTH = { status: "ok", name: "youtube-converter-backend", version: "1.0.0" };

app.get("/", (req, res) => res.json(HEALTH));

/**
 * POST /getFormats
 * body: { url: "https://www.youtube.com/watch?v=..." }
 * Response: proxied JSON from public converter API (or error)
 */
app.post("/getFormats", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "url missing in request body" });

    // Example public converter API. Many public endpoints exist; this acts as a simple proxy.
    const external = `https://y2mate.nu/api/convert?url=${encodeURIComponent(url)}`;

    const out = await axios.get(external, { timeout: 20000 });
    return res.json(out.data);
  } catch (err) {
    console.error("GETFORMATS ERROR:", err?.message || err);
    return res.status(500).json({ error: "failed to fetch formats", detail: err?.message || String(err) });
  }
});

/**
 * POST /download
 * body: { id: "<videoId>", format: "<mp3|mp4>", qualityKey: "<optional>" }
 * This endpoint proxies a second-step call to the external service (if available).
 * Note: exact parameters depend on the 3rd-party API. This function returns the raw JSON response.
 */
app.post("/download", async (req, res) => {
  try {
    const { id, format, qualityKey, url } = req.body;

    // Some public APIs support direct url-based conversion. If the client provided `url`, prefer it.
    if (!id && !url) {
      return res.status(400).json({ error: "missing id or url in request body" });
    }

    // Best-effort: try to call conversion endpoint. Adjust if you plan to use a different public API.
    // We'll attempt to use a y2mate.nu pattern that accepts vid and k parameters when available.
    let api;
    if (url) {
      api = `https://y2mate.nu/api/convert?url=${encodeURIComponent(url)}`;
    } else {
      const k = qualityKey ? `&k=${encodeURIComponent(qualityKey)}` : "";
      api = `https://y2mate.nu/api/convert?vid=${encodeURIComponent(id)}${k}`;
    }

    const out = await axios.get(api, { timeout: 20000 });
    return res.json(out.data);
  } catch (err) {
    console.error("DOWNLOAD ERROR:", err?.message || err);
    return res.status(500).json({ error: "download proxy failed", detail: err?.message || String(err) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`youtube-converter-backend listening on ${port}`);
});
