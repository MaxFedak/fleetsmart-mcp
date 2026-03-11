import { createElement as h, useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";

const SUGGESTIONS = [
  "How many vehicles do I have?",
  "Show all drivers",
  "Any harsh events this week?",
  "Which vehicles are moving right now?",
];

const TOOL_LABELS = {
  list_vehicles: "Fetching vehicles",
  list_drivers: "Fetching drivers",
  list_live_views: "Checking live status",
  list_harsh_events: "Fetching harsh events",
  list_vehicle_locations: "Fetching locations",
  list_pois: "Fetching POIs",
  list_devices: "Fetching devices",
  list_io_events: "Fetching IO events",
  list_poi_events: "Fetching POI events",
  list_driver_vehicle_assignments: "Fetching assignments",
};

function TypingIndicator() {
  return h("div", { className: "typing-indicator" },
    h("span"), h("span"), h("span")
  );
}

function ProgressBar({ progress }) {
  if (!progress || progress.total === 0) return null;
  const pct = Math.round((progress.progress / progress.total) * 100);
  return h("div", { className: "progress-bar-container" },
    h("div", { className: "progress-bar-fill", style: { width: pct + "%" } }),
  );
}

function ToolStatus({ tools, mcpProgress, mcpLogs }) {
  if (tools.length === 0 && mcpLogs.length === 0) return null;
  return h("div", { className: "tool-status" },
    tools.map((t) =>
      h("div", { key: t.id, className: "tool-step " + t.status },
        h("div", { className: "tool-step-icon" },
          t.status === "calling" ? h("div", { className: "spinner" }) : "\u2713"
        ),
        h("div", { className: "tool-step-content" },
          h("span", null, t.label),
          t.status === "calling" && mcpProgress
            ? h(ProgressBar, { progress: mcpProgress })
            : null,
        ),
      )
    ),
    mcpLogs.length > 0
      ? h("div", { className: "mcp-logs" },
          mcpLogs.map((log, i) =>
            h("div", { key: i, className: "mcp-log-line" }, log)
          ),
        )
      : null,
  );
}

// Parse AI SDK data stream protocol
function parseDataStream(text) {
  const lines = text.split("\n").filter(Boolean);
  let content = "";
  const toolCalls = [];

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const code = line.slice(0, colonIdx);
    const data = line.slice(colonIdx + 1);

    switch (code) {
      case "0": // text delta
        try { content += JSON.parse(data); } catch {}
        break;
      case "9": { // tool call start
        try {
          const parsed = JSON.parse(data);
          toolCalls.push({
            id: parsed.toolCallId,
            name: parsed.toolName,
            label: TOOL_LABELS[parsed.toolName] || parsed.toolName,
            status: "calling",
          });
        } catch {}
        break;
      }
      case "a": { // tool result
        try {
          const parsed = JSON.parse(data);
          const tc = toolCalls.find((t) => t.id === parsed.toolCallId);
          if (tc) tc.status = "done";
        } catch {}
        break;
      }
    }
  }

  return { content, toolCalls };
}

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState("claude");
  const [loading, setLoading] = useState(false);
  const [activeTools, setActiveTools] = useState([]);
  const [mcpProgress, setMcpProgress] = useState(null);
  const [mcpLogs, setMcpLogs] = useState([]);
  const messagesRef = useRef(null);
  const inputRef = useRef(null);
  const rawStreamRef = useRef("");

  // Connect to SSE progress endpoint
  useEffect(() => {
    const es = new EventSource("/api/progress");
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "progress") {
          setMcpProgress({ progress: data.progress, total: data.total });
        } else if (data.type === "log") {
          setMcpLogs((prev) => [...prev.slice(-4), data.data]);
        }
      } catch {}
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, activeTools, mcpLogs]);

  useEffect(() => {
    if (!loading && inputRef.current) inputRef.current.focus();
  }, [loading]);

  async function send(text) {
    text = (text || input).trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setActiveTools([]);
    setMcpProgress(null);
    setMcpLogs([]);
    rawStreamRef.current = "";

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, messages: newMessages }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || "Request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        rawStreamRef.current += chunk;

        const { content, toolCalls } = parseDataStream(rawStreamRef.current);

        setActiveTools(toolCalls);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content };
          return updated;
        });
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Error: " + err.message,
        };
        return updated;
      });
    } finally {
      setLoading(false);
      setActiveTools([]);
      setMcpProgress(null);
      setMcpLogs([]);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const showTools = loading && (activeTools.length > 0 || mcpLogs.length > 0);

  return h("div", { id: "root" },
    // Header
    h("header", null,
      h("div", { className: "header-left" },
        h("div", { className: "logo" }, "F"),
        h("h1", null, "FleetSmart"),
      ),
      h("div", { className: "provider-select" },
        h("select", {
          value: provider,
          onChange: (e) => setProvider(e.target.value),
          disabled: loading,
        },
          h("option", { value: "claude" }, "Claude"),
          h("option", { value: "gpt" }, "GPT-4o"),
          h("option", { value: "gemini" }, "Gemini"),
        ),
      ),
    ),

    // Messages or Empty State
    messages.length === 0
      ? h("div", { className: "empty-state" },
          h("div", { className: "empty-icon" }, "\uD83D\uDE9A"),
          h("h2", null, "Fleet Assistant"),
          h("p", null, "Ask anything about your vehicles, drivers, locations, and events."),
          h("div", { className: "suggestions" },
            SUGGESTIONS.map((s) =>
              h("button", {
                key: s,
                className: "suggestion",
                onClick: () => send(s),
              }, s)
            ),
          ),
        )
      : h("div", { className: "messages", ref: messagesRef },
          messages.map((msg, i) => {
            const isLastAssistant = msg.role === "assistant" && loading && i === messages.length - 1;
            return h("div", {
              key: i,
              className: "message " + msg.role + (isLastAssistant ? " streaming" : ""),
            },
              // Tool status inside the message bubble
              isLastAssistant && showTools
                ? h(ToolStatus, { tools: activeTools, mcpProgress, mcpLogs })
                : null,
              // Text content or typing indicator
              msg.content
                ? h("div", { className: "message-text" }, msg.content)
                : loading && isLastAssistant && !showTools
                  ? h(TypingIndicator)
                  : null,
            );
          }),
        ),

    // Input
    h("div", { className: "input-area" },
      h("input", {
        ref: inputRef,
        type: "text",
        placeholder: "Ask about your fleet...",
        value: input,
        onChange: (e) => setInput(e.target.value),
        onKeyDown,
        disabled: loading,
      }),
      h("button", {
        onClick: () => send(),
        disabled: loading || !input.trim(),
      },
        loading ? "..." : "Send"
      ),
    ),
  );
}

createRoot(document.getElementById("root")).render(h(App));
