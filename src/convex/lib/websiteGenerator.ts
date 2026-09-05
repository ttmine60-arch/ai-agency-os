/**
 * PIXEL — Premium Website Template Generator
 *
 * Generates complete, self-contained HTML files for demo websites.
 * Each website is uniquely themed based on the business's industry,
 * includes Tailwind CSS + Framer Motion via CDN, scroll animations,
 * and a B2K Agency upgrade CTA.
 *
 * The output is a single HTML string ready to serve via Convex HTTP.
 */

// ── colour themes per industry ──────────────────────────────────────────────

const INDUSTRY_THEMES: Record<
  string,
  {
    primary: string;
    primaryDark: string;
    accent: string;
    gradient: string;
    bg: string;
    surface: string;
    text: string;
    muted: string;
    emoji: string;
  }
> = {
  Construction: { primary: "#d97706", primaryDark: "#b45309", accent: "#fbbf24", gradient: "from-amber-600 to-orange-700", bg: "#0c0a09", surface: "#1c1917", text: "#fafaf9", muted: "#a8a29e", emoji: "🏗️" },
  Plumbing: { primary: "#0284c7", primaryDark: "#0369a1", accent: "#38bdf8", gradient: "from-sky-600 to-blue-700", bg: "#0c1222", surface: "#1e293b", text: "#f1f5f9", muted: "#94a3b8", emoji: "🔧" },
  Electrician: { primary: "#eab308", primaryDark: "#ca8a04", accent: "#fde047", gradient: "from-yellow-500 to-amber-600", bg: "#0a0a0a", surface: "#1a1a2e", text: "#f5f5f5", muted: "#a3a3a3", emoji: "⚡" },
  "Mechanic / Auto Repair": { primary: "#dc2626", primaryDark: "#b91c1c", accent: "#f87171", gradient: "from-red-600 to-rose-700", bg: "#0f0f0f", surface: "#1c1c1c", text: "#f5f5f5", muted: "#a3a3a3", emoji: "🚗" },
  "Restaurant / Cafe": { primary: "#059669", primaryDark: "#047857", accent: "#34d399", gradient: "from-emerald-600 to-green-700", bg: "#0a1a0f", surface: "#142820", text: "#ecfdf5", muted: "#6ee7b7", emoji: "🍽️" },
  "Salon / Barbershop": { primary: "#a855f7", primaryDark: "#9333ea", accent: "#d946ef", gradient: "from-purple-600 to-fuchsia-600", bg: "#0f0a1a", surface: "#1e1530", text: "#faf5ff", muted: "#c084fc", emoji: "✂️" },
  "Real Estate": { primary: "#0d9488", primaryDark: "#0f766e", accent: "#2dd4bf", gradient: "from-teal-600 to-cyan-700", bg: "#0a1a1a", surface: "#132e2e", text: "#f0fdfa", muted: "#5eead4", emoji: "🏠" },
  Landscaping: { primary: "#16a34a", primaryDark: "#15803d", accent: "#4ade80", gradient: "from-green-600 to-emerald-700", bg: "#0a1a0a", surface: "#143014", text: "#f0fdf4", muted: "#86efac", emoji: "🌿" },
  Roofing: { primary: "#9333ea", primaryDark: "#7e22ce", accent: "#c084fc", gradient: "from-violet-600 to-purple-700", bg: "#0f0a1a", surface: "#1e1530", text: "#faf5ff", muted: "#c084fc", emoji: "🏠" },
  Security: { primary: "#475569", primaryDark: "#334155", accent: "#94a3b8", gradient: "from-slate-600 to-zinc-700", bg: "#0a0f14", surface: "#151e29", text: "#f1f5f9", muted: "#94a3b8", emoji: "🛡️" },
  "Cleaning / Janitorial": { primary: "#0891b2", primaryDark: "#0e7490", accent: "#22d3ee", gradient: "from-cyan-600 to-teal-600", bg: "#0a1418", surface: "#132630", text: "#ecfeff", muted: "#67e8f9", emoji: "✨" },
  "Gym / Fitness": { primary: "#ef4444", primaryDark: "#dc2626", accent: "#f87171", gradient: "from-red-500 to-orange-600", bg: "#0f0a0a", surface: "#1a1212", text: "#fef2f2", muted: "#fca5a5", emoji: "💪" },
  "Hotel / Accommodation": { primary: "#7c3aed", primaryDark: "#6d28d9", accent: "#a78bfa", gradient: "from-violet-600 to-indigo-700", bg: "#0c0a18", surface: "#1a1530", text: "#f5f3ff", muted: "#c4b5fd", emoji: "🏨" },
  Healthcare: { primary: "#0891b2", primaryDark: "#0e7490", accent: "#67e8f9", gradient: "from-cyan-500 to-blue-600", bg: "#0a1418", surface: "#132630", text: "#ecfeff", muted: "#a5f3fc", emoji: "🏥" },
  Retail: { primary: "#ea580c", primaryDark: "#c2410c", accent: "#fb923c", gradient: "from-orange-500 to-red-600", bg: "#0f0a0a", surface: "#1a1212", text: "#fff7ed", muted: "#fdba74", emoji: "🛍️" },
  "Professional Services": { primary: "#2563eb", primaryDark: "#1d4ed8", accent: "#60a5fa", gradient: "from-blue-600 to-indigo-700", bg: "#0a0f1a", surface: "#141e30", text: "#eff6ff", muted: "#93c5fd", emoji: "💼" },
  "Home Services": { primary: "#059669", primaryDark: "#047857", accent: "#34d399", gradient: "from-emerald-500 to-teal-600", bg: "#0a1a10", surface: "#142820", text: "#ecfdf5", muted: "#6ee7b7", emoji: "🏡" },
  Other: { primary: "#6366f1", primaryDark: "#4f46e5", accent: "#818cf8", gradient: "from-indigo-500 to-violet-600", bg: "#0a0a1a", surface: "#161630", text: "#eef2ff", muted: "#a5b4fc", emoji: "⭐" },
};

function getTheme(industry: string) {
  return INDUSTRY_THEMES[industry] ?? INDUSTRY_THEMES["Other"];
}

// ── helper: escape HTML ─────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── input type ──────────────────────────────────────────────────────────────

export interface WebsiteInput {
  business: string;
  industry: string;
  location: string;
  description: string;
  services: string[];
  weaknesses?: string[];
  website?: string | null;
  email?: string;
  phone?: string;
}

// ── main generator ──────────────────────────────────────────────────────────

export function generateWebsite(input: WebsiteInput): string {
  const t = getTheme(input.industry);
  const biz = input.business;
  const loc = input.location;
  const desc = input.description;
  const services = input.services.length > 0
    ? input.services
    : ["Professional service", "Consultation", "Free quote"];
  const hasPhone = !!input.phone;
  const hasEmail = !!input.email;

  return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(biz)} — ${esc(input.industry)} in ${esc(loc)}</title>
<meta name="description" content="${esc(desc)}"/>
<meta property="og:title" content="${esc(biz)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:type" content="website"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<script src="https://cdn.tailwindcss.com"></script>
<script>
tailwind.config={theme:{extend:{colors:{brand:{DEFAULT:'${t.primary}',dark:'${t.primaryDark}',accent:'${t.accent}'},surface:'${t.surface}',darkbg:'${t.bg}'},fontFamily:{sans:['Inter','system-ui','sans-serif']}}}}
</script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:${t.bg};color:${t.text};font-family:'Inter',system-ui,sans-serif;overflow-x:hidden}
.hero-bg{background:linear-gradient(135deg,${t.bg} 0%,${t.surface} 50%,${t.bg} 100%)}
.section-card{background:${t.surface};border:1px solid rgba(255,255,255,0.06);transition:all .3s ease}
.section-card:hover{border-color:${t.primary}33;transform:translateY(-4px);box-shadow:0 20px 40px -12px ${t.primary}22}
@keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideLeft{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
@keyframes slideRight{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:translateX(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}
@keyframes pulse-glow{0%,100%{box-shadow:0 0 20px ${t.primary}44}50%{box-shadow:0 0 40px ${t.primary}66}}
.animate-fade-up{animation:fadeUp .7s ease forwards}
.animate-fade-in{animation:fadeIn .7s ease forwards}
.animate-slide-left{animation:slideLeft .7s ease forwards}
.animate-slide-right{animation:slideRight .7s ease forwards}
.animate-scale-in{animation:scaleIn .5s ease forwards}
.reveal{opacity:0;transform:translateY(30px);transition:all .7s cubic-bezier(.4,0,.2,1)}
.reveal.visible{opacity:1;transform:translateY(0)}
.reveal-delay-1{transition-delay:.1s}.reveal-delay-2{transition-delay:.2s}.reveal-delay-3{transition-delay:.3s}
.btn-primary{background:${t.primary};color:#fff;transition:all .3s ease}
.btn-primary:hover{background:${t.primaryDark};transform:translateY(-2px);box-shadow:0 8px 25px -5px ${t.primary}66}
.btn-outline{border:2px solid ${t.primary};color:${t.primary};transition:all .3s ease}
.btn-outline:hover{background:${t.primary};color:#fff}
.glow-border{box-shadow:0 0 0 1px ${t.primary}33,0 0 30px ${t.primary}11}
.nav-blur{background:${t.bg}cc;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;transform:none!important}}
@media(max-width:640px){.hero-title{font-size:2rem!important;line-height:1.1!important}}
</style>
</head>
<body>

<!-- NAV -->
<nav class="nav-blur fixed top-0 left-0 right-0 z-50 border-b border-white/5">
<div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
<div class="flex items-center gap-2">
<span class="text-2xl">${t.emoji}</span>
<span class="font-bold text-lg">${esc(biz)}</span>
</div>
<div class="hidden sm:flex items-center gap-6 text-sm text-white/60">
<a href="#services" class="hover:text-white transition-colors">Services</a>
<a href="#about" class="hover:text-white transition-colors">About</a>
<a href="#process" class="hover:text-white transition-colors">How It Works</a>
<a href="#contact" class="hover:text-white transition-colors">Contact</a>
</div>
${hasPhone ? `<a href="tel:${esc(input.phone!)}" class="btn-primary px-4 py-2 rounded-lg text-sm font-semibold">Call Now</a>` : `<a href="#contact" class="btn-primary px-4 py-2 rounded-lg text-sm font-semibold">Get a Quote</a>`}
</div>
</nav>

<!-- HERO -->
<section class="hero-bg min-h-screen flex items-center relative overflow-hidden pt-16">
<div class="absolute inset-0 opacity-10">
<div class="absolute top-1/4 left-1/4 w-96 h-96 rounded-full" style="background:radial-gradient(circle,${t.primary}44 0%,transparent 70%);filter:blur(80px)"></div>
<div class="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full" style="background:radial-gradient(circle,${t.accent}33 0%,transparent 70%);filter:blur(60px)"></div>
</div>
<div class="max-w-6xl mx-auto px-4 sm:px-6 py-20 relative z-10">
<div class="max-w-3xl">
<div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6" style="background:${t.primary}22;color:${t.accent}">
<span class="w-2 h-2 rounded-full" style="background:${t.accent}"></span>
${esc(input.industry)} in ${esc(loc)}
</div>
<h1 class="hero-title text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-6" style="animation:fadeUp .8s ease">
${esc(biz)}
<span class="block mt-2" style="color:${t.accent}">Professional ${esc(input.industry).toLowerCase()} services</span>
</h1>
<p class="text-lg sm:text-xl text-white/60 mb-8 max-w-xl" style="animation:fadeUp .8s ease .1s both">${esc(desc)}</p>
<div class="flex flex-wrap gap-4" style="animation:fadeUp .8s ease .2s both">
<a href="#contact" class="btn-primary px-8 py-3.5 rounded-xl text-base font-semibold inline-flex items-center gap-2">Get a Free Quote
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
</a>
<a href="#services" class="btn-outline px-8 py-3.5 rounded-xl text-base font-semibold">Our Services</a>
</div>
</div>
</div>
<div class="absolute bottom-0 left-0 right-0 h-px" style="background:linear-gradient(90deg,transparent,${t.primary}44,transparent)"></div>
</section>

<!-- STATS BAR -->
<section class="py-8 border-y border-white/5" style="background:${t.surface}">
<div class="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
<div class="reveal"><div class="text-2xl sm:text-3xl font-black" style="color:${t.accent}">10+</div><div class="text-xs text-white/50 mt-1">Years Experience</div></div>
<div class="reveal reveal-delay-1"><div class="text-2xl sm:text-3xl font-black" style="color:${t.accent}">500+</div><div class="text-xs text-white/50 mt-1">Projects Done</div></div>
<div class="reveal reveal-delay-2"><div class="text-2xl sm:text-3xl font-black" style="color:${t.accent}">24/7</div><div class="text-xs text-white/50 mt-1">Availability</div></div>
<div class="reveal reveal-delay-3"><div class="text-2xl sm:text-3xl font-black" style="color:${t.accent}">100%</div><div class="text-xs text-white/50 mt-1">Satisfaction</div></div>
</div>
</section>

<!-- SERVICES -->
<section id="services" class="py-20 sm:py-28">
<div class="max-w-6xl mx-auto px-4 sm:px-6">
<div class="text-center mb-16 reveal">
<span class="text-xs font-semibold uppercase tracking-widest" style="color:${t.accent}">What We Do</span>
<h2 class="text-3xl sm:text-4xl font-black mt-3">Our Services</h2>
<p class="text-white/50 mt-3 max-w-lg mx-auto">Professional solutions tailored to your needs</p>
</div>
<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
${services.map((s, i) => `
<div class="section-card rounded-2xl p-8 reveal" style="animation-delay:${i * 0.1}s">
<div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5" style="background:${t.primary}22">
${["🔧", "⚡", "🛠️", "📋", "🎯", "🚀"][i % 6]}
</div>
<h3 class="text-xl font-bold mb-3">${esc(s)}</h3>
<p class="text-white/50 text-sm leading-relaxed">Professional ${esc(s.toLowerCase())} services delivered with excellence and attention to detail.</p>
</div>`).join("\n")}
</div>
</div>
</section>

<!-- ABOUT -->
<section id="about" class="py-20 sm:py-28" style="background:${t.surface}">
<div class="max-w-6xl mx-auto px-4 sm:px-6">
<div class="grid lg:grid-cols-2 gap-12 items-center">
<div class="reveal">
<span class="text-xs font-semibold uppercase tracking-widest" style="color:${t.accent}">About Us</span>
<h2 class="text-3xl sm:text-4xl font-black mt-3 mb-6">Why Choose ${esc(biz)}?</h2>
<p class="text-white/60 leading-relaxed mb-6">${esc(desc)}</p>
<p class="text-white/60 leading-relaxed mb-8">Based in ${esc(loc)}, we combine experience with modern techniques to deliver outstanding results every time.</p>
<div class="grid grid-cols-2 gap-4">
<div class="flex items-center gap-3 p-3 rounded-xl" style="background:${t.bg}">
<div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style="background:${t.primary}22">✅</div>
<span class="text-sm font-medium">Experienced Team</span>
</div>
<div class="flex items-center gap-3 p-3 rounded-xl" style="background:${t.bg}">
<div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style="background:${t.primary}22">✅</div>
<span class="text-sm font-medium">Quality Guarantee</span>
</div>
<div class="flex items-center gap-3 p-3 rounded-xl" style="background:${t.bg}">
<div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style="background:${t.primary}22">✅</div>
<span class="text-sm font-medium">Fast Response</span>
</div>
<div class="flex items-center gap-3 p-3 rounded-xl" style="background:${t.bg}">
<div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style="background:${t.primary}22">✅</div>
<span class="text-sm font-medium">${esc(loc)}</span>
</div>
</div>
</div>
<div class="relative reveal reveal-delay-2">
<div class="aspect-[4/3] rounded-2xl overflow-hidden glow-border" style="background:linear-gradient(135deg,${t.primary}33,${t.accent}22)">
<div class="w-full h-full flex items-center justify-center">
<div class="text-center">
<div class="text-6xl mb-4">${t.emoji}</div>
<div class="text-xl font-bold">${esc(biz)}</div>
<div class="text-sm text-white/50 mt-1">${esc(loc)}</div>
</div>
</div>
</div>
</div>
</div>
</div>
</section>

<!-- PROCESS -->
<section id="process" class="py-20 sm:py-28">
<div class="max-w-6xl mx-auto px-4 sm:px-6">
<div class="text-center mb-16 reveal">
<span class="text-xs font-semibold uppercase tracking-widest" style="color:${t.accent}">How It Works</span>
<h2 class="text-3xl sm:text-4xl font-black mt-3">Our Process</h2>
<p class="text-white/50 mt-3 max-w-lg mx-auto">Simple, transparent, and professional from start to finish</p>
</div>
<div class="grid sm:grid-cols-3 gap-8">
${[
  { num: "01", title: "Get In Touch", desc: "Reach out by phone, email or our contact form. We'll discuss your needs." },
  { num: "02", title: "Free Consultation", desc: "We assess your requirements and provide a clear, no-obligation quote." },
  { num: "03", title: "We Deliver", desc: "Our team gets to work and delivers results that exceed expectations." },
].map((step, i) => `
<div class="text-center reveal" style="animation-delay:${i * 0.15}s">
<div class="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center text-2xl font-black" style="background:${t.primary}22;color:${t.accent}">${step.num}</div>
<h3 class="text-xl font-bold mb-3">${step.title}</h3>
<p class="text-white/50 text-sm leading-relaxed">${step.desc}</p>
</div>`).join("\n")}
</div>
</div>
</section>

<!-- FAQ -->
<section class="py-20 sm:py-28" style="background:${t.surface}">
<div class="max-w-3xl mx-auto px-4 sm:px-6">
<div class="text-center mb-12 reveal">
<span class="text-xs font-semibold uppercase tracking-widest" style="color:${t.accent}">FAQ</span>
<h2 class="text-3xl sm:text-4xl font-black mt-3">Frequently Asked Questions</h2>
</div>
<div class="space-y-4">
${[
  { q: "How do I get started?", a: "Simply reach out by phone or fill in our contact form. We'll schedule a free consultation to discuss your needs." },
  { q: "Do you offer free quotes?", a: "Yes! We provide free, no-obligation quotes for all our services. Get in touch and we'll put together a tailored proposal." },
  { q: "What areas do you serve?", a: `We serve ${esc(loc)} and the surrounding areas. Contact us to confirm if we cover your specific location.` },
  { q: "How quickly can you start?", a: "We typically respond within 24 hours and can start most projects within a week, depending on scope and availability." },
].map((faq, i) => `
<details class="section-card rounded-xl group reveal" style="animation-delay:${i * 0.1}s">
<summary class="flex items-center justify-between p-5 cursor-pointer font-semibold list-none">
${faq.q}
<span class="text-white/30 group-open:rotate-180 transition-transform">▾</span>
</summary>
<div class="px-5 pb-5 text-sm text-white/50 leading-relaxed">${faq.a}</div>
</details>`).join("\n")}
</div>
</div>
</section>

<!-- CONTACT -->
<section id="contact" class="py-20 sm:py-28">
<div class="max-w-6xl mx-auto px-4 sm:px-6">
<div class="text-center mb-12 reveal">
<span class="text-xs font-semibold uppercase tracking-widest" style="color:${t.accent}">Contact Us</span>
<h2 class="text-3xl sm:text-4xl font-black mt-3">Get a Free Quote</h2>
<p class="text-white/50 mt-3">Ready to get started? We'd love to hear from you.</p>
</div>
<div class="grid lg:grid-cols-2 gap-8">
<div class="section-card rounded-2xl p-8 reveal">
<form class="space-y-4" onsubmit="event.preventDefault();this.querySelector('.success-msg').style.display='block';this.querySelector('button').textContent='Sent! ✓'">
<input type="text" placeholder="Your name" required class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-${t.primary} transition-colors"/>
<input type="email" placeholder="Email address" required class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-${t.primary} transition-colors"/>
${hasPhone ? `<input type="tel" placeholder="Phone number" class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-${t.primary} transition-colors"/>` : ""}
<textarea placeholder="How can we help you?" rows="4" class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-${t.primary} transition-colors resize-none"></textarea>
<button type="submit" class="btn-primary w-full py-3.5 rounded-xl font-semibold text-base">Send Message</button>
<div class="success-msg hidden text-center text-sm mt-3" style="color:${t.accent}">✓ Thank you! We'll be in touch shortly.</div>
</form>
</div>
<div class="space-y-6 reveal reveal-delay-2">
${hasPhone ? `
<div class="section-card rounded-xl p-5 flex items-center gap-4">
<div class="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style="background:${t.primary}22">📞</div>
<div><div class="text-sm text-white/50">Call us</div><a href="tel:${esc(input.phone!)}" class="font-semibold hover:underline" style="color:${t.accent}">${esc(input.phone!)}</a></div>
</div>` : ""}
${hasEmail ? `
<div class="section-card rounded-xl p-5 flex items-center gap-4">
<div class="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style="background:${t.primary}22">✉️</div>
<div><div class="text-sm text-white/50">Email us</div><a href="mailto:${esc(input.email!)}" class="font-semibold hover:underline" style="color:${t.accent}">${esc(input.email!)}</a></div>
</div>` : ""}
<div class="section-card rounded-xl p-5 flex items-center gap-4">
<div class="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style="background:${t.primary}22">📍</div>
<div><div class="text-sm text-white/50">Location</div><div class="font-semibold">${esc(loc)}</div></div>
</div>
${hasPhone ? `
<a href="https://wa.me/${input.phone!.replace(/[^0-9]/g, "")}" target="_blank" rel="noopener" class="section-card rounded-xl p-5 flex items-center gap-4 hover:border-green-500/30 transition-colors">
<div class="w-10 h-10 rounded-lg flex items-center justify-center text-lg bg-green-500/22">💬</div>
<div><div class="text-sm text-white/50">WhatsApp</div><div class="font-semibold text-green-400">Chat with us</div></div>
</a>` : ""}
</div>
</div>
</div>
</section>

<!-- FOOTER -->
<footer class="py-10 border-t border-white/5" style="background:${t.surface}">
<div class="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
<div class="flex items-center gap-2">
<span class="text-xl">${t.emoji}</span>
<span class="font-bold">${esc(biz)}</span>
</div>
<div class="text-xs text-white/30">© ${new Date().getFullYear()} ${esc(biz)}. All rights reserved.</div>
<div class="text-xs text-white/20">Professional ${esc(input.industry).toLowerCase()} in ${esc(loc)}</div>
</div>
</footer>

<!-- B2K UPGRADE CTA (subtle) -->
<div class="fixed bottom-0 left-0 right-0 z-40 py-3 px-4 text-center" style="background:linear-gradient(90deg,${t.primary}ee,${t.primaryDark}ee);backdrop-filter:blur(10px)">
<p class="text-sm text-white/90 font-medium">
Want this website live for your business?
<a href="tel:${hasPhone ? esc(input.phone!) : ""}" class="ml-2 font-bold underline underline-offset-2 hover:text-white">Get in touch →</a>
</p>
</div>

<!-- SCROLL REVEAL -->
<script>
(function(){
const obs=new IntersectionObserver((entries)=>{
entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target)}})
},{threshold:0.1,rootMargin:'0px 0px -50px 0px'});
document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));
})();
</script>

</body>
</html>`;
}
