"use node";

/**
 * ECHO — AI Receptionist voice handler.
 *
 * Flow:
 *   1. Twilio POSTs to /voice/incoming when a call arrives.
 *   2. We return TwiML with a greeting + <Gather> that captures speech.
 *   3. Twilio POSTs the transcription to /voice/respond.
 *   4. We call Groq (llama-3.3-70b-versatile) for an AI reply and return TwiML.
 *   5. The <Gather> loops so the caller can keep talking.
 *
 * In DEMO mode (no GROQ_API_KEY), ECHO uses scripted fallback responses.
 */

// ── shared TwiML helpers ────────────────────────────────────────────────────

function twimlXml(content: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<Response>${content}</Response>`,
  ].join("\n");
}

function twimlHeaders(): Record<string, string> {
  return { "Content-Type": "text/xml" };
}

const GREETING =
  "Thanks for calling! This is the B2K Agency receptionist. How can I help you today?";

const FALLBACK_RESPONSES = [
  "I'd be happy to help with that. Let me get some more details — could you leave your name and the best number to reach you?",
  "Great question. One of our team members will follow up with you shortly. Can I grab your name and email address?",
  "I understand. We offer AI receptionist services and custom websites for businesses like yours. Would you like to schedule a quick call to learn more?",
  "Absolutely — I can help with that. Let me take down your information and we'll get back to you within the hour.",
  "Thanks for your interest! Could you tell me a bit more about what you're looking for? I want to make sure we connect you with the right person.",
];

let fallbackIndex = 0;
function nextFallback(): string {
  const resp = FALLBACK_RESPONSES[fallbackIndex % FALLBACK_RESPONSES.length];
  fallbackIndex++;
  return resp;
}

// ── Groq LLM call ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are ECHO, the friendly AI receptionist for B2K Agency — a company that builds websites and provides AI receptionist services for local businesses.

Your job:
- Greet callers warmly
- Answer questions about B2K Agency's services (websites from R5,000, AI receptionist for R1,500/month)
- Collect the caller's name, business name, phone number, and email
- Qualify the lead (what kind of business, do they have a website, how many calls do they get)
- Offer to book a consultation call
- Keep responses brief (2-3 sentences max) since this is a phone conversation
- Sound natural and professional — never mention being AI unless directly asked
- If asked who you are: "I'm the receptionist here at B2K Agency"

Pricing:
- Website: from R5,000 one-time
- Premium Website: from R12,000 one-time
- AI Receptionist: R1,500/month (answers calls 24/7, qualifies leads, books appointments)
- Website + AI Receptionist package: from R15,000

Always try to book a consultation by the end of the call.`;

async function callGroq(
  apiKey: string,
  conversationHistory: { role: string; content: string }[],
): Promise<string> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 200,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...conversationHistory,
        ],
      }),
    });

    if (!res.ok) {
      console.error(`[ECHO] Groq error ${res.status}: ${await res.text()}`);
      return nextFallback();
    }

    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return data.choices[0]?.message?.content ?? nextFallback();
  } catch (err) {
    console.error("[ECHO] Groq call failed:", err);
    return nextFallback();
  }
}

// ── request handlers ────────────────────────────────────────────────────────

export interface VoiceRequest {
  method: string;
  url: string;
  formData?: Record<string, string>;
}

export interface VoiceResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

/**
 * Handle an incoming voice webhook request.
 * Routes to the correct handler based on the URL path.
 */
export async function handleVoiceRequest(req: VoiceRequest): Promise<VoiceResponse> {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/voice/incoming" && req.method === "POST") {
    return handleIncoming(req);
  }
  if (path === "/voice/respond" && req.method === "POST") {
    return handleRespond(req);
  }

  return {
    status: 404,
    headers: { "Content-Type": "text/plain" },
    body: "Not found",
  };
}

/**
 * POST /voice/incoming
 * Twilio hits this when a call arrives. Returns a greeting + Gather for speech.
 */
function handleIncoming(_req: VoiceRequest): VoiceResponse {
  // Twilio Gather with speech recognition, looping back to /voice/respond
  const gather = [
    `<Gather input="speech" action="/voice/respond" method="POST"`,
    ` speechTimeout="auto" language="en-US" enhanced="true">`,
    `<Say voice="Polly.Joanna">${escapeXml(GREETING)}</Say>`,
    `</Gather>`,
    // Fallback if no speech detected
    `<Say voice="Polly.Joanna">I didn't catch that. Could you repeat?</Say>`,
    `<Redirect>/voice/incoming</Redirect>`,
  ].join("");

  return {
    status: 200,
    headers: twimlHeaders(),
    body: twimlXml(gather),
  };
}

/**
 * POST /voice/respond
 * Twilio hits this with the speech transcription from Gather.
 * Calls Groq for an AI response, then loops back for more conversation.
 */
async function handleRespond(req: VoiceRequest): Promise<VoiceResponse> {
  const speechResult = req.formData?.SpeechResult ?? "";
  const callSid = req.formData?.CallSid ?? "unknown";
  const callerNumber = req.formData?.From ?? "unknown";

  console.log(`[ECHO] Call ${callSid} from ${callerNumber}: "${speechResult}"`);

  const apiKey = process.env.GROQ_API_KEY;

  let aiResponse: string;
  if (apiKey) {
    // Build conversation context from the speech result
    const conversation = [
      { role: "user", content: speechResult },
    ];
    aiResponse = await callGroq(apiKey, conversation);
  } else {
    aiResponse = nextFallback();
  }

  console.log(`[ECHO] Response: "${aiResponse}"`);

  // Return TwiML: speak the response, then Gather again for the next turn
  const gather = [
    `<Gather input="speech" action="/voice/respond" method="POST"`,
    ` speechTimeout="auto" language="en-US" enhanced="true">`,
    `<Say voice="Polly.Joanna">${escapeXml(aiResponse)}</Say>`,
    `</Gather>`,
    // If caller goes silent, offer to transfer or say goodbye
    `<Say voice="Polly.Joanna">Are you still there? If you'd like, I can have someone from our team give you a call back. Otherwise, thanks for reaching out to B2K Agency!</Say>`,
    `<Hangup/>`,
  ].join("");

  return {
    status: 200,
    headers: twimlHeaders(),
    body: twimlXml(gather),
  };
}

// ── utils ───────────────────────────────────────────────────────────────────

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
