const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "20kb" }));

const PORT = process.env.PORT || 3000;

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
