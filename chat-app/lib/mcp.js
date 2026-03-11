import { experimental_createMCPClient as createMCPClient } from "ai";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { EventEmitter } from "events";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");

let client = null;
let transport = null;

// EventEmitter for progress/logging notifications from MCP server
export const mcpEvents = new EventEmitter();

async function getClient() {
  if (client) return client;

  transport = new StdioMCPTransport({
    command: "uv",
    args: ["run", "python", "main.py"],
    env: { ...process.env },
    cwd: PROJECT_ROOT,
  });

  // Wrap transport.onmessage to intercept server notifications
  const origStart = transport.start.bind(transport);
  transport.start = async function () {
    await origStart();

    const origOnMessage = this.onmessage;
    this.onmessage = (message) => {
      // Intercept notification messages (have method but no id)
      if ("method" in message && !("id" in message)) {
        if (message.method === "notifications/progress") {
          mcpEvents.emit("progress", message.params);
        } else if (message.method === "notifications/message") {
          mcpEvents.emit("log", message.params);
        }
        // Don't forward notifications to the MCP client (it would error)
        return;
      }
      if (origOnMessage) origOnMessage(message);
    };
  };

  client = await createMCPClient({ transport });

  console.log("MCP client connected");
  return client;
}

export async function getMCPTools() {
  const c = await getClient();
  return c.tools();
}

export async function closeMCP() {
  if (client) {
    await client.close();
    client = null;
    transport = null;
    console.log("MCP client closed");
  }
}
