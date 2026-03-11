import "dotenv/config";
import express from "express";
import { handleChat } from "./lib/chat.js";
import { closeMCP } from "./lib/mcp.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

app.post("/api/chat", async (req, res) => {
  const { provider = "claude", messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }

  try {
    const result = await handleChat({ provider, messages });
    result.pipeTextStreamToResponse(res);
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
