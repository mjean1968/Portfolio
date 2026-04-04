export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
  }

  const { text } = await req.json();
  if (!text) {
    return new Response(JSON.stringify({ error: "Missing text" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not set" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || "fzs8sFDQ1CaHEz2mW45U";

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `ElevenLabs ${response.status}: ${errText}` }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const buffer = await response.arrayBuffer();
    return new Response(buffer, { status: 200, headers: { "Content-Type": "audio/mpeg" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
