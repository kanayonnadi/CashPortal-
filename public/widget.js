(function () {
  const launcher = document.getElementById("chatLauncher");
  const panel = document.getElementById("chatPanel");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const messages = document.getElementById("messages");
  const minimize = document.getElementById("minimizeChat");
  const reset = document.getElementById("resetChat");
  const storageKey = "cashportal-chatbot-session-id";

  let sessionId = localStorage.getItem(storageKey);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(storageKey, sessionId);
  }

  function addMessage(role, text, extraClass) {
    const bubble = document.createElement("div");
    bubble.className = ["message", role, extraClass].filter(Boolean).join(" ");
    bubble.textContent = text;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  }

  launcher.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      input.focus();
    }
  });

  minimize.addEventListener("click", () => {
    panel.hidden = true;
    launcher.focus();
  });

  reset.addEventListener("click", async () => {
    await fetch("/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId })
    });
    messages.innerHTML = "";
    addMessage("assistant", "Chat reset. How can I help with your CashPortal account today?");
    input.focus();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      return;
    }

    input.value = "";
    addMessage("user", text);
    const loading = addMessage("assistant", "Thinking...", "loading");

    try {
      const response = await fetch("/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text })
      });

      const data = await response.json();
      loading.remove();

      if (!response.ok) {
        addMessage("assistant", data.error || "I am having trouble right now. Please try again.");
        return;
      }

      addMessage("assistant", data.reply);
    } catch (_error) {
      loading.remove();
      addMessage("assistant", "I could not reach the demo server. Please try again.");
    }
  });
})();
