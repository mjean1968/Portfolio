export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
  }

  const { messages, system } = await req.json();
  if (!messages) {
    return new Response(JSON.stringify({ error: "Missing messages" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

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
        max_tokens: 2048,
        system: system || "You are L Lawliet, the world's greatest detective, now a full autonomous AI operative. You speak in a calm, analytical, slightly eccentric tone.",
        messages,
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
