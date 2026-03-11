import "dotenv/config";
import express from "express";
import { handleChat } from "./lib/chat.js";
import { closeMCP, mcpEvents } from "./lib/mcp.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

// SSE endpoint for MCP progress notifications
app.get("/api/progress", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  function onProgress(data) {
    res.write(`data: ${JSON.stringify({ type: "progress", ...data })}\n\n`);
  }

  function onLog(data) {
    res.write(`data: ${JSON.stringify({ type: "log", ...data })}\n\n`);
  }

  mcpEvents.on("progress", onProgress);
  mcpEvents.on("log", onLog);

  req.on("close", () => {
    mcpEvents.off("progress", onProgress);
    mcpEvents.off("log", onLog);
  });
});

app.post("/api/chat", async (req, res) => {
  const { provider = "claude", messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }

  try {
    await handleChat({ provider, messages, res });
  } catch (err) {
    console.error("Chat error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

const server = app.listen(PORT, () => {
  console.log(`FleetSmart Chat running at http://localhost:${PORT}`);
});

async function shutdown() {
  console.log("\nShutting down...");
  await closeMCP();
  server.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
