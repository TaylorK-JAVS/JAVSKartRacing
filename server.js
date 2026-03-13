const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const rootDir = __dirname;
const dataDir = path.join(rootDir, "data");
const assetsRacersDir = path.join(rootDir, "assets", "racers");
const racersPath = path.join(dataDir, "racers.json");
const racersSeedPath = path.join(dataDir, "racers.seed.json");

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(assetsRacersDir, { recursive: true });
if (!fs.existsSync(racersPath) && fs.existsSync(racersSeedPath)) {
  fs.copyFileSync(racersSeedPath, racersPath);
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function cleanupRemovedImages(previousRacers, nextRacers) {
  const nextImages = new Set(nextRacers.map((racer) => racer.image).filter(Boolean));
  previousRacers
    .map((racer) => racer.image)
    .filter((image) => image && !nextImages.has(image))
    .forEach(removeLocalImage);
}

function sanitizeRacer(racer, index) {
  return {
    id: typeof racer.id === "string" && racer.id ? racer.id : `racer-${index + 1}`,
    name: typeof racer.name === "string" ? racer.name.trim() : "",
    image: typeof racer.image === "string" ? racer.image : "",
    selected: racer.selected !== false,
    wins: Number.isFinite(racer.wins) ? Math.max(0, Math.trunc(racer.wins)) : 0,
    leadMs: Number.isFinite(racer.leadMs) ? Math.max(0, Math.trunc(racer.leadMs)) : 0,
  };
}

function decodeImageData(dataUrl) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Unsupported image payload.");
  }

  const mimeType = match[1];
  const base64 = match[2];
  const extensionMap = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
  };
  const extension = extensionMap[mimeType];
  if (!extension) {
    throw new Error("Unsupported image type.");
  }

  return {
    buffer: Buffer.from(base64, "base64"),
    extension,
  };
}

function removeLocalImage(imagePath) {
  if (!imagePath || !imagePath.startsWith("assets/racers/")) {
    return;
  }

  const resolvedPath = path.join(rootDir, imagePath);
  if (fs.existsSync(resolvedPath)) {
    fs.unlinkSync(resolvedPath);
  }
}

function handleApi(request, response, pathname, body) {
  if (request.method === "GET" && pathname === "/api/racers") {
    return sendJson(response, 200, { racers: readJson(racersPath) });
  }

  if (request.method === "POST" && pathname === "/api/racers") {
    const parsed = JSON.parse(body || "{}");
    const previousRacers = fs.existsSync(racersPath) ? readJson(racersPath) : [];
    const racers = Array.isArray(parsed.racers) ? parsed.racers.map(sanitizeRacer).filter((racer) => racer.name) : [];
    cleanupRemovedImages(previousRacers, racers);
    writeJson(racersPath, racers);
    return sendJson(response, 200, { racers });
  }

  if (request.method === "POST" && pathname === "/api/upload-image") {
    const parsed = JSON.parse(body || "{}");
    const racerId = typeof parsed.racerId === "string" && parsed.racerId ? parsed.racerId : `racer-${Date.now()}`;
    const previousImage = typeof parsed.previousImage === "string" ? parsed.previousImage : "";
    const imageData = typeof parsed.imageData === "string" ? parsed.imageData : "";
    const { buffer, extension } = decodeImageData(imageData);
    const filename = `${racerId}-${Date.now()}${extension}`;
    const imagePath = path.join(assetsRacersDir, filename);
    fs.writeFileSync(imagePath, buffer);
    removeLocalImage(previousImage);
    return sendJson(response, 200, { image: `assets/racers/${filename}` });
  }

  if (request.method === "POST" && pathname === "/api/reset") {
    const seedRacers = readJson(racersSeedPath);
    writeJson(racersPath, seedRacers);
    for (const entry of fs.readdirSync(assetsRacersDir)) {
      fs.unlinkSync(path.join(assetsRacersDir, entry));
    }
    return sendJson(response, 200, { racers: seedRacers });
  }

  return sendJson(response, 404, { error: "Not found" });
}

function serveStatic(response, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const resolvedPath = path.join(rootDir, safePath);

  if (!resolvedPath.startsWith(rootDir) || !fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const extension = path.extname(resolvedPath).toLowerCase();
  response.writeHead(200, { "Content-Type": mimeTypes[extension] || "application/octet-stream" });
  fs.createReadStream(resolvedPath).pipe(response);
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  const chunks = [];

  request.on("data", (chunk) => {
    chunks.push(chunk);
  });

  request.on("end", () => {
    const body = Buffer.concat(chunks).toString("utf8");

    try {
      if (url.pathname.startsWith("/api/")) {
        handleApi(request, response, url.pathname, body);
        return;
      }

      serveStatic(response, url.pathname);
    } catch (error) {
      sendJson(response, 500, { error: error.message });
    }
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`JAVS Kart Racing running at http://localhost:${port}`);
});
