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
 */
app.post("/getFormats", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "url missing in request body" });

    const external = `https://y2mate.nu/api/convert?url=${encodeURIComponent(url)}`;
    const out = await axios.get(external, { timeout: 20000 });

    return res.json(out.data);
  } catch (err) {
    console.error("GETFORMATS ERROR:", err?.message || err);
    return res.status(500).json({ error: "failed to fetch formats", detail: err?.message });
  }
});

/**
 * POST /download
 */
app.post("/download", async (req, res) => {
  try {
    const { id, format, qualityKey, url } = req.body;

    if (!id && !url) {
      return res.status(400).json({ error: "missing id or url in request body" });
    }

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
    return res.status(500).json({ error: "download proxy failed", detail: err?.message });
  }
});

/* 🔴 CRITICAL FIX HERE 🔴 */
/* Only use process.env.PORT — no fallback */
const port = process.env.PORT;

if (!port) {
  console.error("FATAL: Render didn't pass a port.");
  process.exit(1);
}

app.listen(port, () => {
  console.log(`youtube-converter-backend listening on ${port}`);
});
