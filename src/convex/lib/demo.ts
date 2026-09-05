/**
 * Demo-mode data pool.
 *
 * In DEMO mode the autonomous engine draws from this pool of plausible
 * (fictional) businesses instead of real web crawls, so the entire agency
 * loop — discover → research → offer → follow-up → close — can be watched
 * end-to-end without any API keys.
 *
 * Every entry carries a `webPresence` rating (0-10) that ATLAS turns into a
 * website score, plus `takesCalls` so ECHO knows who can get a receptionist
 * demo. All businesses are fictional.
 */

export type DemoBusiness = {
  business: string;
  industry: string;
  location: string;
  website: string | null;
  email: string;
  phone: string;
  description: string;
  services: string[];
  weaknesses: string[];
  webPresence: number; // 0 = no website, 10 = excellent
  takesCalls: boolean;
};

export const DEMO_BUSINESSES: DemoBusiness[] = [
  // Construction / Home services
  { business: "Beacon Ridge Builders", industry: "Construction", location: "Sandton, Gauteng", website: null, email: "info@beaconridgebuilders.co.za", phone: "+27 11 234 8810", description: "Custom home builds, renovations and project management serving northern Johannesburg since 2009.", services: ["New builds", "Renovations", "Project management"], weaknesses: ["No website", "No online portfolio", "No booking system"], webPresence: 0, takesCalls: true },
  { business: "Alston Removals & Storage", industry: "Home Services", location: "Cape Town, Western Cape", website: "www.alstonremovals.co.za", email: "hello@alstonremovals.co.za", phone: "+27 21 447 3310", description: "Residential and office removals across the Western Cape with secure storage units.", services: ["Residential removals", "Office moves", "Storage"], weaknesses: ["Outdated design", "No online quotes", "No live availability"], webPresence: 3, takesCalls: true },
  { business: "Kingspan Roofing Co.", industry: "Roofing", location: "Centurion, Gauteng", website: null, email: "admin@kingspanroofing.co.za", phone: "+27 12 663 2290", description: "Roof inspections, repairs and replacements for homes and commercial buildings.", services: ["Roof repairs", "Re-roofing", "Inspections"], weaknesses: ["No website", "Phone-only enquiries", "No service area map"], webPresence: 0, takesCalls: true },
  // Plumbing
  { business: "AquaFix Plumbing", industry: "Plumbing", location: "Pretoria, Gauteng", website: "www.aquafixplumbing.co.za", email: "bookings@aquafixplumbing.co.za", phone: "+27 12 342 1180", description: "Emergency and scheduled plumbing for homes and small businesses in Pretoria.", services: ["Emergency callouts", "Geyser replacement", "Bathroom installation"], weaknesses: ["Slow site", "No online booking", "No emergency line"], webPresence: 4, takesCalls: true },
  { business: "Twin Rivers Plumbing", industry: "Plumbing", location: "Umhlanga, KwaZulu-Natal", website: null, email: "twinrivers@telkomsa.net", phone: "+27 31 566 7740", description: "Family-run plumbing business serving the greater Durban north coast.", services: ["Leak repairs", "Drain cleaning", "Solar geysers"], weaknesses: ["No website", "Email-only contact", "No reviews presence"], webPresence: 0, takesCalls: true },
  // Electricians
  { business: "VoltEdge Electrical", industry: "Electrician", location: "Randburg, Gauteng", website: "www.voltedge.co.za", email: "info@voltedge.co.za", phone: "+27 11 789 5560", description: "Residential and commercial electrical contracting, solar and backup power installs.", services: ["Electrical compliance", "Solar installs", "Backup power"], weaknesses: ["Generic template site", "No quote form", "No service response times"], webPresence: 4, takesCalls: true },
  // Mechanics
  { business: "GreaseMonkey Auto Works", industry: "Mechanic / Auto Repair", location: "Germiston, Gauteng", website: null, email: "service@greasemonkeyauto.co.za", phone: "+27 11 873 9900", description: "Full-service vehicle repairs, diagnostics and services for all major brands.", services: ["Diagnostics", "Services", "Brake & suspension"], weaknesses: ["No website", "No online parts quotes"], webPresence: 0, takesCalls: true },
  { business: "Coastal Car Care", industry: "Mechanic / Auto Repair", location: "Somerset West, Western Cape", website: "www.coastalcarcare.co.za", email: "book@coastalcarcare.co.za", phone: "+27 21 852 3340", description: "Independent workshop specialising in European vehicles, with courtesy vehicles available.", services: ["Major services", "Engine diagnostics", "Aircon repair"], weaknesses: ["Site is 8 years old", "No booking calendar", "No vehicle checklist tool"], webPresence: 3, takesCalls: true },
  // Restaurants
  { business: "The Copper Pot Kitchen", industry: "Restaurant / Cafe", location: "Paarl, Western Cape", website: "www.copperpotkitchen.co.za", email: "hello@copperpotkitchen.co.za", phone: "+27 21 863 5520", description: "Farm-to-table restaurant and coffee roastery in the Cape Winelands.", services: ["Dining", "Catering", "Coffee roasting"], weaknesses: ["No table reservations online", "No menu updates", "No delivery channel"], webPresence: 5, takesCalls: true },
  { business: "Saffron Street Eatery", industry: "Restaurant / Cafe", location: "Durban, KwaZulu-Natal", website: null, email: "saffronstreet@gmail.com", phone: "+27 31 337 2210", description: "Modern Indian street-food restaurant in Durban's city centre.", services: ["Dining", "Takeaways", "Event catering"], weaknesses: ["No website", "No online ordering", "No reservation system"], webPresence: 0, takesCalls: true },
  // Salons
  { business: "Blush & Brow Studio", industry: "Salon / Barbershop", location: "Fourways, Gauteng", website: "www.blushandbrow.co.za", email: "bookings@blushandbrow.co.za", phone: "+27 11 465 7780", description: "Premium beauty studio offering lash extensions, brows, nails and facials.", services: ["Lash extensions", "Brow sculpting", "Nails", "Facials"], weaknesses: ["No online booking", "Phone missed after hours", "No package deals online"], webPresence: 4, takesCalls: true },
  { business: "The Groom Room Barbers", industry: "Salon / Barbershop", location: "Middelburg, Mpumalanga", website: null, email: "groomroom@gmail.com", phone: "+27 13 243 1180", description: "Traditional barbershop with hot towel shaves and beard sculpting.", services: ["Cuts", "Hot towel shaves", "Beard grooming"], weaknesses: ["No website", "No online appointments"], webPresence: 0, takesCalls: true },
  // Real estate
  { business: "Hartley Property Group", industry: "Real Estate", location: "Ballito, KwaZulu-Natal", website: "www.hartleyproperty.co.za", email: "listings@hartleyproperty.co.za", phone: "+27 32 946 6600", description: "Residential sales and rentals on the KZN north coast.", services: ["Sales", "Rentals", "Property management"], weaknesses: ["Lead form broken", "No after-hours enquiry handling", "No valuation tool"], webPresence: 5, takesCalls: true },
  // Landscaping
  { business: "Verdant Gardens Landscaping", industry: "Landscaping", location: "Stellenbosch, Western Cape", website: null, email: "verdantgardens@webmail.co.za", phone: "+27 21 886 2230", description: "Design, installation and maintenance of residential gardens and irrigation.", services: ["Garden design", "Irrigation", "Maintenance contracts"], weaknesses: ["No website", "No project gallery", "No quote form"], webPresence: 0, takesCalls: true },
  // Security
  { business: "IronGate Security", industry: "Security", location: "Boksburg, Gauteng", website: "www.irongate.co.za", email: "enquiries@irongate.co.za", phone: "+27 11 918 3320", description: "Alarm response, armed guarding and CCTV installation for homes and businesses.", services: ["Alarm response", "CCTV installs", "Armed response"], weaknesses: ["No online quotes", "No service status page", "Contact form unreliable"], webPresence: 3, takesCalls: true },
  // Cleaning
  { business: "PureClean Services", industry: "Cleaning / Janitorial", location: "East London, Eastern Cape", website: "www.purecleanservices.co.za", email: "office@purecleanservices.co.za", phone: "+27 43 722 4410", description: "Commercial and domestic cleaning, deep cleans and office janitorial contracts.", services: ["Office cleaning", "Deep cleans", "Carpet care"], weaknesses: ["No online booking", "No transparent pricing", "No client portal"], webPresence: 3, takesCalls: true },
  // Gyms
  { business: "Forge Strength Gym", industry: "Gym / Fitness", location: "Bloemfontein, Free State", website: "www.forgestrength.co.za", email: "coach@forgestrength.co.za", phone: "+27 51 430 2210", description: "Strength and conditioning gym with personal training and small group classes.", services: ["Memberships", "Personal training", "Group classes"], weaknesses: ["No membership signup online", "No class booking", "No trial booking"], webPresence: 4, takesCalls: true },
  { business: "Pulse Fitness Studio", industry: "Gym / Fitness", location: "Bedfordview, Gauteng", website: null, email: "pulsefitness@gmail.com", phone: "+27 11 615 9900", description: "Boutique fitness studio offering Pilates, spin and HIIT classes.", services: ["Pilates", "Spin", "HIIT classes"], weaknesses: ["No website", "No class schedule online", "No online payments"], webPresence: 0, takesCalls: true },
  // Hotels
  { business: "The Fernwood Guest Lodge", industry: "Hotel / Accommodation", location: "Knysna, Western Cape", website: "www.fernwoodlodge.co.za", email: "stay@fernwoodlodge.co.za", phone: "+27 44 382 1130", description: "Boutique guest lodge overlooking the Knysna lagoon with 14 suites.", services: ["Lodging", "Breakfast", "Event venue"], weaknesses: ["No direct booking engine", "No chatbot for availability", "Reception hours limited"], webPresence: 5, takesCalls: true },
  // Healthcare
  { business: "Linden Family Dental", industry: "Healthcare", location: "Linden, Gauteng", website: "www.lindenfamilydental.co.za", email: "reception@lindenfamilydental.co.za", phone: "+27 11 888 3320", description: "Family dentistry practice with cosmetic, restorative and orthodontic care.", services: ["General dentistry", "Cosmetic", "Orthodontics"], weaknesses: ["No online booking", "Calls missed during procedures", "No reminder system"], webPresence: 4, takesCalls: true },
  // Retail
  { business: "Trailhead Outdoor Gear", industry: "Retail", location: "Cape Town, Western Cape", website: "www.trailheadgear.co.za", email: "shop@trailheadgear.co.za", phone: "+27 21 424 6670", description: "Specialist outdoor and hiking equipment store with a small online shop.", services: ["Retail", "Online shop", "Rentals"], weaknesses: ["Product catalogue is static", "No stock availability", "No click-and-collect"], webPresence: 5, takesCalls: false },
  // Professional services
  { business: "Meridian Accounting", industry: "Professional Services", location: "Polokwane, Limpopo", website: "www.meridianaccounting.co.za", email: "team@meridianaccounting.co.za", phone: "+27 15 297 1180", description: "Accounting, tax and payroll for small and medium businesses.", services: ["Accounting", "Tax returns", "Payroll"], weaknesses: ["No appointment booking", "No client intake forms", "No service pricing"], webPresence: 4, takesCalls: true },
  { business: "Pinnacle Legal Advisors", industry: "Professional Services", location: "Sandton, Gauteng", website: "www.pinnaclelegal.co.za", email: "consult@pinnaclelegal.co.za", phone: "+27 11 784 2210", description: "Commercial and corporate law firm with a focus on SMEs.", services: ["Commercial law", "Contracts", "Compliance"], weaknesses: ["No consultation booking", "Generic template site", "No practice areas detail"], webPresence: 4, takesCalls: true },
];

/** Humanized discovery sources NOVA reports. */
export const DISCOVERY_SOURCES = [
  "directory crawl · new listing",
  "web crawl · missing website detected",
  "directory crawl · outdated site detected",
  "local search · high-intent keyword",
  "directory crawl · no online booking",
  "social scan · no web presence",
];

/** Things prospects actually reply with in demo mode. */
export const REPLY_POOL = [
  "Thanks for the note — this is timely. What would the full cost look like including setup?",
  "Interesting. We've been meaning to sort out our website for a while. Can you send over some examples?",
  "We get a lot of calls we miss. How does the receptionist thing actually work on our existing number?",
  "We already have someone who handles our marketing, but I'd like to see the pricing anyway.",
  "Sounds good. Can we set up a quick call this week to talk it through?",
  "Honestly we've been burned before. What makes you different?",
  "Please take us off your list.",
  "Can you send a proposal with the website plus receptionist option?",
];

/** Follow-up copy MERCURY uses. */
export const FOLLOW_UP_POOL = [
  "Just floating this back to the top of your inbox — happy to answer any questions.",
  "I know inboxes get busy. If the timing's not right, no stress — reply STOP and I'll leave you alone.",
  "Wanted to make sure you saw the demo link. It's live at {url} and takes 2 minutes to look at.",
];

/** Industry → extra weaknesses ATLAS can spot. */
export const INDUSTRY_WEAKNESSES: Record<string, string[]> = {
  "Restaurant / Cafe": ["No reservation system", "No online ordering", "Menu not updated online"],
  "Salon / Barbershop": ["No online booking", "Missed calls after hours", "No package deals online"],
  "Construction": ["No portfolio online", "No quote request form", "No review presence"],
  "Roofing": ["No website", "No emergency contact line", "No service-area map"],
  "Plumbing": ["No online booking", "No emergency line", "No transparent pricing"],
  "Electrician": ["No quote form", "No response-time promise", "No solar/backup info"],
  "Mechanic / Auto Repair": ["No online booking", "No upfront quote tool", "No vehicle checklist"],
  "Real Estate": ["Lead form broken", "No after-hours enquiry handling", "No valuation tool"],
  "Landscaping": ["No project gallery", "No quote form", "No maintenance packages online"],
  "Security": ["No online quotes", "No service-status page", "Contact form unreliable"],
  "Cleaning / Janitorial": ["No online booking", "No transparent pricing", "No client portal"],
  "Gym / Fitness": ["No class booking", "No trial signup", "No membership pricing online"],
  "Hotel / Accommodation": ["No direct booking engine", "No chatbot for availability", "Limited reception hours"],
  "Healthcare": ["No online booking", "Calls missed during procedures", "No reminder system"],
  "Professional Services": ["No appointment booking", "No intake forms", "No service pricing"],
  "Retail": ["Static catalogue", "No stock availability", "No click-and-collect"],
};

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function chance(p: number): boolean {
  return Math.random() < p;
}