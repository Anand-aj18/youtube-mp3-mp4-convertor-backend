import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const HEALTH = { status: "ok", name: "youtube-converter-backend", version: "2.0.0" };
app.get("/", (req, res) => res.json(HEALTH));

/* ------------------------------
   Get YouTube Formats (safe API)
--------------------------------*/
app.post("/getFormats", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) return res.status(400).json({ error: "url missing" });

    const API = `https://ytdl.tandpfun.com/api/info?url=${encodeURIComponent(url)}`;

    const response = await axios.get(API, { timeout: 15000 });

    const data = response.data;

    if (!data || !data.formats) {
      return res.status(500).json({ error: "Failed to fetch formats" });
    }

    // Separate mp3 and mp4
    const audioStreams = data.formats.filter(f =>
      f.mimeType.includes("audio")
    );

    const videoStreams = data.formats.filter(f =>
      f.mimeType.includes("video")
    );

    return res.json({
      title: data.title,
      thumbnailUrl: data.thumbnail,
      audioStreams,
      videoStreams
    });

  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: "Failed to fetch formats" });
  }
});

/* ------------------------------
   Stream Download
--------------------------------*/
app.post("/downloadFile", async (req, res) => {
  try {
    const { streamUrl, format } = req.body;

    if (!streamUrl) return res.status(400).json({ error: "streamUrl missing" });

    const fileName = "youtube." + (format || "mp4");

    const response = await axios({
      url: streamUrl,
      method: "GET",
      responseType: "stream",
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );
    res.setHeader(
      "Content-Type",
      response.headers["content-type"] || "application/octet-stream"
    );

    response.data.pipe(res);

  } catch (e) {
    console.log("DOWNLOAD ERROR:", e.message);
    res.status(500).json({ error: "Download failed" });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Backend running on ${port}`));
