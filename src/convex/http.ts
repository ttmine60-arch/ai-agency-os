import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { handleVoiceRequest } from "./lib/voice";

const http = httpRouter();

auth.addHttpRoutes(http);

// ── ECHO voice webhook ──────────────────────────────────────────────────────
// Twilio sends POST requests here for incoming calls and speech responses.
// In production, point your Twilio phone number's Voice webhook to:
//   https://<your-deployment>.convex.site/voice/incoming

http.route({
  path: "/voice/incoming",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    // Parse form-encoded body from Twilio
    const formData: Record<string, string> = {};
    const text = await request.text();
    for (const pair of text.split("&")) {
      const [key, value] = pair.split("=");
      if (key && value) {
        formData[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, " "));
      }
    }

    const response = await handleVoiceRequest({
      method: "POST",
      url: request.url,
      formData,
    });

    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }),
});

http.route({
  path: "/voice/respond",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const formData: Record<string, string> = {};
    const text = await request.text();
    for (const pair of text.split("&")) {
      const [key, value] = pair.split("=");
      if (key && value) {
        formData[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, " "));
      }
    }

    const response = await handleVoiceRequest({
      method: "POST",
      url: request.url,
      formData,
    });

    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }),
});

export default http;
