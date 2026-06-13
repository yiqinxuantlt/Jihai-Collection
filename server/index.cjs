const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const { createApp } = require("./app.cjs");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 5173);

async function attachFrontend(app) {
  const distPath = path.join(__dirname, "..", "dist");
  if (process.env.NODE_ENV === "production" && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      return res.sendFile(path.join(distPath, "index.html"));
    });
    return;
  }

  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

async function start() {
  const app = createApp();
  await attachFrontend(app);
  app.listen(PORT, HOST, () => {
    console.log(`墨读札记已启动：http://${HOST}:${PORT}/`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
