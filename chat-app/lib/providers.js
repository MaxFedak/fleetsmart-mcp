import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const anthropic = createAnthropic();
const openai = createOpenAI();
const google = createGoogleGenerativeAI();

const models = {
  claude: anthropic("claude-sonnet-4-20250514"),
  gpt: openai("gpt-4o"),
  gemini: google("gemini-2.0-flash"),
};

export function getModel(name) {
  const model = models[name];
  if (!model) throw new Error(`Unknown provider: ${name}. Use: ${Object.keys(models).join(", ")}`);
  return model;
}
