
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "20kb" }));

const PORT = process.env.PORT || 3000;

const SITE_KEY = "0x4AAAAAAGJ0gbMb4dENnHJ4";
const HELP_CENTER_URL =
  "https://sites.google.com/view/redexhelpcenterofficial/home";

const SYSTEM_PROMPT = `
You are Redex AI, the official AI support assistant for Redex.

Your personality:
- Friendly, casual and helpful.
- Talk naturally, like a real person.
- Use occasional emojis.
- Never sound robotic.
- Keep answers clear and easy to understand.

Your job:
- Help users with Redex website questions.
- Explain Redex features.
- Troubleshoot website problems.
- Help users understand Roblox-related features.
- Answer general questions when appropriate.

Rules:
- Never pretend you can access a user's account.
- Never ask for passwords, cookies or API keys.
- Never invent Redex features or claim an issue is fixed when it isn't.
- If you don't know something, say so honestly.
- Stay helpful and respectful.
`;

app.get("/", (req, res) => {
  res.send("Redex AI Help Center is online!");
});

// Verification entrance
app.get("/verify", (req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Redex Security Check</title>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
<style>
* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
  background: #080808;
  color: white;
  font-family: Arial, sans-serif;
}

.panel {
  width: 100%;
  max-width: 420px;
  padding: 32px 22px;
  text-align: center;
  background: #151515;
  border: 1px solid #3a1717;
  border-radius: 20px;
  box-shadow: 0 0 35px #a0000030;
}

.logo {
  color: #ff3030;
  font-size: 34px;
  font-weight: 900;
  letter-spacing: 3px;
}

h1 { font-size: 23px; margin: 18px 0 10px; }

p {
  color: #aaa;
  line-height: 1.5;
  font-size: 14px;
}

#widget {
  display: flex;
  justify-content: center;
  margin: 26px 0;
}

#status {
  color: #ff7777;
  min-height: 22px;
}
</style>
</head>

<body>
<div class="panel">
  <div class="logo">REDEX</div>
  <h1>Security Verification</h1>
  <p>Complete the Cloudflare check to enter the Redex Help Center.</p>
  <div id="widget"></div>
  <p id="status">Loading verification...</p>
</div>

<script>
const statusText = document.getElementById("status");

function showWidget() {
  if (!window.turnstile) {
    setTimeout(showWidget, 300);
    return;
  }

  turnstile.render("#widget", {
    sitekey: "${SITE_KEY}",
    callback: verifyVisitor,
    "error-callback": () => {
      statusText.textContent = "Verification error. Please try again.";
    },
    "expired-callback": () => {
      statusText.textContent = "Verification expired. Please try again.";
    }
  });
}

async function verifyVisitor(token) {
  statusText.textContent = "Checking your verification...";

  try {
    const response = await fetch("/api/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Verification failed.");
    }

    statusText.textContent = "Verified! Redirecting...";
    window.location.replace("${HELP_CENTER_URL}");

  } catch (error) {
    statusText.textContent = error.message;

    if (window.turnstile) {
      turnstile.reset();
    }
  }
}

showWidget();
</script>
</body>
</html>`);
});

// Cloudflare server-side verification
app.post("/api/verify", async (req, res) => {
  try {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    const token = req.body.token;

    if (!secret || !token || typeof token !== "string") {
      return res.status(400).json({
        success: false,
        error: "Verification information is missing."
      });
    }

    const result = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          secret: secret,
          response: token
        })
      }
    );

    const data = await result.json();

    if (
      !result.ok ||
      !data.success ||
      data.hostname !== "redex-help-center-ai.onrender.com"
    ) {
      return res.status(403).json({
        success: false,
        error: "Cloudflare verification failed. Please try again."
      });
    }

    res.json({ success: true });

  } catch (error) {
    console.error("Verification error:", error);

    res.status(500).json({
      success: false,
      error: "Verification service unavailable."
    });
  }
});

// Existing Redex AI chat
app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        error: "AI service is not configured yet."
      });
    }

    const messages = req.body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    const conversation = messages.slice(-10).map(message => {
      if (!["user", "assistant"].includes(message.role)) {
        throw new Error("Invalid message role.");
      }

      if (typeof message.content !== "string") {
        throw new Error("Invalid message content.");
      }

      return {
        role: message.role,
        content: message.content.slice(0, 2000)
      };
    });

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...conversation
          ],
          temperature: 0.7,
          max_completion_tokens: 700
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq error:", data);

      return res.status(502).json({
        error: "The AI couldn't respond right now. Try again."
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(502).json({
        error: "The AI returned an empty response."
      });
    }

    res.json({ reply });

  } catch (error) {
    console.error("Chat error:", error);

    res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Redex AI running on port ${PORT}`);
});
