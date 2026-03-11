import { experimental_createMCPClient as createMCPClient } from "ai";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");

let client = null;

async function getClient() {
  if (client) return client;

  client = await createMCPClient({
    transport: new StdioMCPTransport({
      command: "/usr/local/bin/uv",
      args: ["run", "python", "main.py"],
      env: { ...process.env },
      cwd: PROJECT_ROOT,
    }),
  });

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
    console.log("MCP client closed");
  }
}
