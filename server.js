import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const HEALTH = { status: "ok", name: "youtube-converter-backend", version: "2.0.0" };
app.get("/", (req, res) => res.json(HEALTH));

/* ✔ Bulletproof YouTube ID extractor */
function extractVideoId(url) {
  try {
    const u = new URL(url.trim());

    // youtu.be/<id>
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.slice(1);
    }

    // youtube.com/watch?v=<id>
    if (u.searchParams.has("v")) {
      return u.searchParams.get("v");
    }

    // youtube.com/shorts/<id>
    if (u.pathname.includes("/shorts/")) {
      return u.pathname.split("/shorts/")[1].split("?")[0];
    }

    // youtube.com/embed/<id>
    if (u.pathname.includes("/embed/")) {
      return u.pathname.split("/embed/")[1].split("?")[0];
    }

    return null;
  } catch {
    return null;
  }
}

/* ⭐ GET FORMATS */
app.post("/getFormats", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "url missing" });

    const id = extractVideoId(url);
    if (!id) return res.status(400).json({ error: "invalid YouTube url" });

    const api = `https://pipedapi.silkky.cloud/streams/${id}`;
    console.log("Fetching formats for ID:", id);

    const out = await axios.get(api, { timeout: 15000 });

    return res.json(out.data);

  } catch (err) {
    console.error("GETFORMATS ERROR:", err.message);
    return res.status(500).json({ error: "failed to fetch formats" });
  }
});

/* ⭐ DOWNLOAD — returns direct file URL */
app.post("/download", async (req, res) => {
  try {
    const { url, format } = req.body;

    if (!url || !format)
      return res.status(400).json({ error: "url or format missing" });

    const id = extractVideoId(url);
    if (!id) return res.status(400).json({ error: "invalid YouTube url" });

    const api = `https://pipedapi.silkky.cloud/streams/${id}`;
    console.log("Fetching download for ID:", id);

    const out = await axios.get(api, { timeout: 15000 });

    const all = [
      ...out.data.audioStreams,
      ...out.data.videoStreams
    ];

    const selected = all.find(
      (x) => x.quality === format || x.audioQuality === format
    );

    if (!selected)
      return res.status(404).json({ error: "format not available" });

    return res.json({ downloadUrl: selected.url });

  } catch (err) {
    console.error("DOWNLOAD ERROR:", err.message);
    return res.status(500).json({ error: "download failed" });
  }
});

/* Start Server */
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
