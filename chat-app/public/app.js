import { createElement as h, useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";

const SUGGESTIONS = [
  "How many vehicles do I have?",
  "Show all drivers",
  "Any harsh events this week?",
  "Which vehicles are moving right now?",
];

function TypingIndicator() {
  return h("div", { className: "typing-indicator" },
    h("span"), h("span"), h("span")
  );
}

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState("claude");
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

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
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = { ...last, content: last.content + chunk };
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
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function clearChat() {
    setMessages([]);
  }

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
          messages.map((msg, i) =>
            h("div", {
              key: i,
              className: "message " + msg.role +
                (msg.role === "assistant" && loading && i === messages.length - 1
                  ? " streaming" : ""),
            },
              msg.content
                ? msg.content
                : loading
                  ? h(TypingIndicator)
                  : ""
            )
          ),
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
