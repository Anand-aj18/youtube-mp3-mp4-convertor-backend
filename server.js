import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

/* ------------------------------
   HEALTH CHECK
--------------------------------*/
const HEALTH = { status: "ok", name: "youtube-converter-backend", version: "1.0.0" };
app.get("/", (req, res) => res.json(HEALTH));

/* ------------------------------
   Extract YouTube Video ID
--------------------------------*/
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
      const match = url.match(p);
      if (match) return match[1];
    }

    // Fallback
    const u = new URL(url);
    if (u.searchParams.has("v")) return u.searchParams.get("v");
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
  } catch {
    return null;
  }

  return null;
}

/* ------------------------------
   Piped Mirrors (Most Stable)
--------------------------------*/
const SOURCES = [
  "https://pipedapi.in.projectsegfau.lt/streams/",
  "https://pipedapi.syncpundit.io/streams/",
  "https://pipedapi.fediverse.tv/streams/",
  "https://pipedapi.nosebs.com/streams/"
];

/* ------------------------------
   Fetch Formats
--------------------------------*/
app.post("/getFormats", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) return res.status(400).json({ error: "url missing" });

    const id = extractVideoId(url);
    if (!id) return res.status(400).json({ error: "invalid YouTube url" });

    let result = null;

    for (const base of SOURCES) {
      try {
        const apiURL = base + id;
        const response = await axios.get(apiURL, { timeout: 10000 });

        if (response.data) {
          result = response.data;
          break;
        }
      } catch (err) {
        console.log("Mirror failed:", base, err.message);
      }
    }

    if (!result) return res.status(500).json({ error: "All mirrors failed" });

    return res.json(result);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch formats" });
  }
});

/* ------------------------------
   Download File Proxy (Fixes "Failed - No file")
--------------------------------*/
app.post("/downloadFile", async (req, res) => {
  try {
    const { streamUrl, format } = req.body;

    if (!streamUrl) return res.status(400).json({ error: "streamUrl missing" });

    const safeURL = decodeURIComponent(streamUrl);

    const fileName = "youtube." + (format || "mp4");

    const response = await axios({
      url: safeURL,
      method: "GET",
      responseType: "stream",
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
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
    console.error("DOWNLOAD ERROR:", error.message);
    return res.status(500).json({ error: "Download failed" });
  }
});

/* ------------------------------
   Start Server
--------------------------------*/
const port = process.env.PORT || 10000;
app.listen(port, () =>
  console.log(`youtube-converter-backend running on ${port}`)
);
