import { streamText } from "ai";
import { getModel } from "./providers.js";
import { getMCPTools } from "./mcp.js";

const SYSTEM_PROMPT = `You are a helpful fleet management assistant for FleetSmart. You have access to tools that query vehicle, driver, device, and event data from the FleetSmart API. Use these tools to answer questions about the fleet. Be concise and present data in a readable format. Today's date is ${new Date().toISOString().split("T")[0]}.`;

export async function handleChat({ provider, messages }) {
  const model = getModel(provider);
  const tools = await getMCPTools();

  return streamText({
    model,
    system: SYSTEM_PROMPT,
    messages,
    tools,
    maxSteps: 10,
  });
}
