/**
 * Firecrawl-powered real web research for ATLAS.
 *
 * In LIVE mode ATLAS uses this module to scrape a business's website and
 * produce a genuine research summary, weakness list, service list and
 * web-presence score — instead of relying on the demo pool in lib/demo.ts.
 *
 * The API key is read from `process.env.FIRECRAWL_API_KEY`. When the key is
 * absent, no live research happens and the demo data is used as a fallback.
 */

import { v } from "convex/values";

// Firecrawl's Crawl API endpoint.
const FIRECRAWL_API = "https://api.firecrawl.dev/v3/crawl";

export type ScrapeResult = {
  researchSummary: string;
  weaknesses: string[];
  services: string[];
  webPresence: number; // 0-10
  email: string | null;
  phone: string | null;
  rawContentSnippet: string;
};

/**
 * Crawl a single URL with Firecrawl and extract research data for a business.
 *
 * `businessName` and `industry` are used only to guide the extraction heuristics
 * (e.g. which phrases count as "services" or "weaknesses"). The API itself does
 * not need them, so this is purely local post-processing.
 */
export async function researchWebsite(
  businessName: string,
  industry: string,
  website: string,
): Promise<ScrapeResult | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return null; // silently fall back to demo data
  }

  const url = website.startsWith("http")
    ? website
    : `https://${website.replace(/^www\./, "")}`;

  let payload: Record<string, unknown> = {
    url,
    maxUrls: 1,
    scrapeOptions: {
      formats: ["markdown"],
      waitFor: 2_000,
    },
    crawlerOptions: {
      excludes: ["**/login", "**/signin", "**/account", "**/cart", "**/checkout"],
    },
    allows: ["cookies"],
  };

  let raw: string;
  try {
    const res = await fetch(FIRECRAWL_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn("[firecrawl] crawl failed (using fallback):", res.status, text.slice(0, 200));
      return null;
    }

    const json = (await res.json()) as { data?: { items?: Array<{ markdown?: string; html?: string }> } };
    if (!json.data?.items?.length) {
      return null;
    }

    const first = json.data.items[0];
    raw = first.markdown ?? first.html ?? "";
    if (!raw || raw.length < 50) return null;
  } catch (err) {
    console.warn("[firecrawl] network error (using fallback):", err);
    return null;
  }

  // Truncate for storage. Lead.researchSummary is v.string() so we keep it readable.
  const snippet = raw.slice(0, 4000).replace(/\s+/g, " ").trim();

  // ── local extraction heuristics (no second API call) ──────────────────────

  const lower = snippet.toLowerCase();

  // Services: look for section headers + bullet-like lines
  const serviceHints = [
    "services", "what we do", "our work", "offered", "we provide",
    "specialize", "specialise", "offer", "including", "menu", "treatment",
    "package", "products", "categories", "repairs", "installation",
    "maintenance", "consultation", "diagnostics", "cleaning",
    "inspection", "removal", "construction", "renovation", "building",
    "electrical", "plumbing", "roofing", "landscaping", "salon",
    "beauty", "fitness", "training", "dental", "medical",
  ];
  const serviceLines = new Set<string>();

  // Lines that look like service bullet points or section list items
  const lines = snippet.split("\n").filter((l) => l.trim().length > 2);
  for (const line of lines) {
    const trimmed = line.trim().replace(/^[-*·•\s]+/, "");
    if (trimmed.length > 50) continue; // probably prose, not a list line
    const l = trimmed.toLowerCase();
    if (serviceHints.some((h) => l.includes(h)) && trimmed.length > 3) {
      serviceLines.add(trimmed);
    }
  }

  // Deduplicate and keep the best ones
  const services: string[] = [];
  const seen = new Set<string>();
  for (const s of Array.from(serviceLines).slice(0, 25)) {
    const normalized = s.length > 70 ? s.slice(0, 70) : s;
    if (!seen.has(normalized.toLowerCase())) {
      seen.add(normalized.toLowerCase());
      services.push(s.length > 70 ? s.slice(0, 70).replace(/\s+$/, "") : s);
    }
    if (services.length >= 8) break;
  }

  // Weaknesses / missing features we can detect from the raw text
  const weaknesses: string[] = [];
  if (!/booking|reserve|appointment|schedule|book online|online booking/i.test(lower)) {
    weaknesses.push("No online booking or appointment system");
  }
  if (!/quote|estimate|get a quote|pricing|prices|cost|sales/i.test(lower)) {
    weaknesses.push("No transparent pricing or quote tool");
  }
  if (!/contact|phone|email|get in touch|enquiry/i.test(lower)) {
    weaknesses.push("Contact information not prominent");
  }
  if (!/review|testimonial|client|portfolio|projects|work we've done/i.test(lower)) {
    weaknesses.push("No portfolio, reviews or case studies");
  }
  if (!/mobile|responsive|site/i.test(lower) && services.length === 0) {
    weaknesses.push("Website appears minimal or outdated");
  }
  if (!whatWeDoPhrase(lower)) {
    weaknesses.push("Services not clearly listed on the site");
  }

  // Limit to 5
  const finalWeaknesses = weaknesses.slice(0, 5);

  // Web presence score: 0 = almost no content, 10 = rich site
  const contentLen = snippet.length;
  let wp = 0;
  if (contentLen > 500) wp = 4;
  if (contentLen > 2000) wp = 6;
  if (contentLen > 5000) wp = 8;
  if (services.length >= 3) wp = Math.min(10, wp + 2);

  // Build a human-readable research summary
  const researchSummary = `${businessName} (${industry}) — website reviewed via Firecrawl. ` +
    `${services.length > 0 ? `Key services identified: ${services.slice(0, 4).join(", ")}. ` : "No clear service list found. "}` +
    `${finalWeaknesses.length > 0 ? `Gaps detected: ${finalWeaknesses.join("; ")}.` : "Site looks mostly complete."}`;

  // Try to extract an email + phone as a bonus (regex on the raw snippet)
  const email = (snippet.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] ?? null) as string | null;
  const phone = (snippet.match(/\+?[\d\s\-()]{7,20}/)?.[0] ?? null) as string | null;

  return {
    researchSummary,
    weaknesses: finalWeaknesses,
    services,
    webPresence: wp,
    email,
    phone,
    rawContentSnippet: snippet,
  };
}

function whatWeDoPhrase(text: string): boolean {
  return /we (offer|provide|specialize|specialise|do|build|deliver|work|help|create|design|install|repair|clean|maintain|treat|train|coach|assist)/i.test(text)
    || /our (services|products|work|team|offering)/i.test(text)
    || /what (we do|sets us apart|makes us different)/i.test(text);
}

// ── Convex-compatible exported types (used by sim.ts) ────────────────────────

/** Value validator for firecrawl config stored in settings (if added later). */
export const firecrawlConfigValidator = v.object({
  crawlMaxDepth: v.optional(v.number()),
  crawlScrapeFormat: v.optional(v.union(v.literal("markdown"), v.literal("html"))),
});
