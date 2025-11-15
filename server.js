import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", name: "youtube-converter-backend", version: "1.0.0" });
});

/* ------------------------ GET FORMATS ------------------------ */
app.post("/getFormats", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL missing" });

    const api = `https://y2mate.nu/api/convert?url=${encodeURIComponent(url)}`;

    let out;
    try {
      out = await axios.get(api, { timeout: 20000 });
    } catch (err) {
      console.error("EXTERNAL API ERROR (getFormats):", err.message);
      return res.status(500).json({
        error: "external-api-failed",
        detail: err.message,
      });
    }

    res.json(out.data);
  } catch (err) {
    console.error("INTERNAL ERROR (getFormats):", err.message);
    res.status(500).json({ error: "internal-error", detail: err.message });
  }
});

/* ------------------------ DOWNLOAD ------------------------ */
app.post("/download", async (req, res) => {
  try {
    const { id, format, qualityKey, url } = req.body;

    if (!id && !url)
      return res.status(400).json({ error: "missing id or url" });

    let api;
    if (url) {
      api = `https://y2mate.nu/api/convert?url=${encodeURIComponent(url)}`;
    } else {
      api = `https://y2mate.nu/api/convert?vid=${encodeURIComponent(id)}${
        qualityKey ? `&k=${qualityKey}` : ""
      }`;
    }

    let out;
    try {
      out = await axios.get(api, { timeout: 20000 });
    } catch (err) {
      console.error("EXTERNAL API ERROR (download):", err.message);
      return res.status(500).json({
        error: "external-api-failed",
        detail: err.message,
      });
    }

    res.json(out.data);
  } catch (err) {
    console.error("INTERNAL ERROR (download):", err.message);
    res.status(500).json({ error: "internal-error", detail: err.message });
  }
});

/* ------------------------ PORT ------------------------ */
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
