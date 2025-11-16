import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.json({ status: "ok" }));

// Extract ID from YouTube links
function extractVideoId(url) {
  try {
    url = url.trim();

    const match =
      url.match(/v=([^&]+)/) ||
      url.match(/youtu\.be\/([^?&]+)/) ||
      url.match(/shorts\/([^?&]+)/);

    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/* ------------------------------
   GET FORMATS - working API
--------------------------------*/
app.post("/getFormats", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) return res.status(400).json({ error: "url missing" });

    const id = extractVideoId(url);
    if (!id) return res.status(400).json({ error: "invalid YouTube url" });

    const API_URL = `https://piped.video/api/v1/streams/${id}`;

    const response = await axios.get(API_URL, { timeout: 15000 });

    const data = response.data;

    return res.json({
      title: data.title,
      thumbnailUrl: data.thumbnailUrl,
      audioStreams: data.audioStreams,
      videoStreams: data.videoStreams
    });

  } catch (error) {
    console.log("GETFORMATS ERROR:", error.message);
    res.status(500).json({ error: "Failed to fetch formats" });
  }
});

/* ------------------------------
   DOWNLOAD FILE
--------------------------------*/
app.post("/downloadFile", async (req, res) => {
  try {
    const { streamUrl, format } = req.body;

    if (!streamUrl) return res.status(400).json({ error: "streamUrl missing" });

    const fileName = `youtube.${format || "mp4"}`;

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

  } catch (error) {
    console.log("DOWNLOAD ERROR:", error.message);
    res.status(500).json({ error: "Download failed" });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log("Backend running on " + port));
