export const config = { runtime: "edge" };

// Simple in-memory rate limiting per IP (resets on cold start)
const rateMap = new Map();
const RATE_LIMIT = 30; // max requests per window
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRate(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW) {
    rateMap.set(ip, { start: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
  }

  // Rate limit by IP
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  if (!checkRate(ip)) {
    return new Response(JSON.stringify({ error: "...Rate limited. Please try again later." }), { status: 429, headers: { "Content-Type": "application/json" } });
  }

  const { messages, system } = await req.json();
  if (!messages) {
    return new Response(JSON.stringify({ error: "Missing messages" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // Cap conversation length to prevent abuse
  const trimmedMessages = messages.slice(-20);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: system || "You are L, Merlin Jean's AI portfolio assistant.",
        messages: trimmedMessages,
      }),
    });

    const data = await response.json();
    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const reply = data.content?.[0]?.text || "...no response.";
    return new Response(JSON.stringify({ reply }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
