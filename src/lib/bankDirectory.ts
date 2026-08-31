/* Bank directory — the institution registry behind "associate a bank account".
 *
 * Design rationale lives in docs/research/bank-association.md. The short version:
 * there are ~8,900 US depository institutions, commercial real estate skews toward
 * regional and community banks, and the one identifier that is authoritative, free,
 * printed on every statement, and checksum-verifiable is the nine-digit ABA routing
 * number. So the routing number is the primary key here, not the brand or the logo.
 *
 * The entries below are a representative slice of the FedACH participant directory
 * for prototype purposes — money-center, regional, community and credit union — not
 * a maintained mirror. Every routing number passes the ABA checksum, which is what
 * makes the "type nine digits" entry path trustworthy enough to lead with. */

export type InstitutionKind = "bank" | "credit-union";

export interface Institution {
  /* Nine-digit ABA routing number. The record's identity. */
  routing: string;
  /* Legal name as it appears in the routing directory. */
  name: string;
  /* What a human calls it. Used in dense rows where the legal name is noise. */
  shortName: string;
  city: string;
  state: string;
  kind: InstitutionKind;
  /* Only present for the handful of brands we ship an asset for. Everything
   * else falls back to a monogram tile — nothing in the flow may depend on
   * a logo existing. */
  logoSrc?: string;
}

export const institutions: Institution[] = [
  { routing: "021000021", name: "JPMorgan Chase Bank, N.A.", shortName: "Chase", city: "New York", state: "NY", kind: "bank", logoSrc: "/logos/chase.png" },
  { routing: "026009593", name: "Bank of America, N.A.", shortName: "BoA", city: "Charlotte", state: "NC", kind: "bank", logoSrc: "/logos/boa.png" },
  { routing: "121000248", name: "Wells Fargo Bank, N.A.", shortName: "Wells Fargo", city: "San Francisco", state: "CA", kind: "bank", logoSrc: "/logos/wells-fargo.png" },
  { routing: "021000089", name: "Citibank, N.A.", shortName: "Citibank", city: "New York", state: "NY", kind: "bank" },
  { routing: "091000022", name: "U.S. Bank, N.A.", shortName: "U.S. Bank", city: "Cincinnati", state: "OH", kind: "bank" },
  { routing: "043000096", name: "PNC Bank, N.A.", shortName: "PNC Bank", city: "Pittsburgh", state: "PA", kind: "bank" },
  { routing: "053101121", name: "Truist Bank", shortName: "Truist", city: "Charlotte", state: "NC", kind: "bank" },
  { routing: "031201360", name: "TD Bank, N.A.", shortName: "TD Bank", city: "Wilmington", state: "DE", kind: "bank" },
  { routing: "056073502", name: "Capital One, N.A.", shortName: "Capital One", city: "McLean", state: "VA", kind: "bank" },
  { routing: "042000314", name: "Fifth Third Bank, N.A.", shortName: "Fifth Third", city: "Cincinnati", state: "OH", kind: "bank" },
  { routing: "011500120", name: "Citizens Bank, N.A.", shortName: "Citizens Bank", city: "Providence", state: "RI", kind: "bank" },
  { routing: "041001039", name: "KeyBank N.A.", shortName: "KeyBank", city: "Cleveland", state: "OH", kind: "bank" },
  { routing: "022000046", name: "Manufacturers and Traders Trust Co.", shortName: "M&T Bank", city: "Buffalo", state: "NY", kind: "bank" },
  { routing: "044000024", name: "The Huntington National Bank", shortName: "Huntington", city: "Columbus", state: "OH", kind: "bank" },
  { routing: "062000019", name: "Regions Bank", shortName: "Regions", city: "Birmingham", state: "AL", kind: "bank" },
  { routing: "053100300", name: "First-Citizens Bank & Trust Co.", shortName: "First Citizens", city: "Raleigh", state: "NC", kind: "bank" },
  { routing: "111000753", name: "Comerica Bank", shortName: "Comerica", city: "Dallas", state: "TX", kind: "bank" },
  { routing: "124000054", name: "Zions Bancorporation, N.A.", shortName: "Zions Bank", city: "Salt Lake City", state: "UT", kind: "bank" },
  { routing: "082907273", name: "Bank OZK", shortName: "Bank OZK", city: "Little Rock", state: "AR", kind: "bank" },
  { routing: "322070381", name: "East West Bank", shortName: "East West", city: "Pasadena", state: "CA", kind: "bank" },
  { routing: "322270288", name: "Pacific Premier Bank", shortName: "Pacific Premier", city: "Irvine", state: "CA", kind: "bank" },
  { routing: "123103729", name: "Banner Bank", shortName: "Banner Bank", city: "Walla Walla", state: "WA", kind: "bank" },
  { routing: "123205054", name: "Umpqua Bank", shortName: "Umpqua Bank", city: "Portland", state: "OR", kind: "bank" },
  { routing: "325070760", name: "WaFd Bank", shortName: "WaFd Bank", city: "Seattle", state: "WA", kind: "bank" },
  { routing: "325084426", name: "HomeStreet Bank", shortName: "HomeStreet", city: "Seattle", state: "WA", kind: "bank" },
  { routing: "121135045", name: "Tri Counties Bank", shortName: "Tri Counties", city: "Chico", state: "CA", kind: "bank" },
  { routing: "121102036", name: "Mechanics Bank", shortName: "Mechanics Bank", city: "Walnut Creek", state: "CA", kind: "bank" },
  { routing: "121140218", name: "Bank of Marin", shortName: "Bank of Marin", city: "Novato", state: "CA", kind: "bank" },
  { routing: "122105744", name: "Western Alliance Bank", shortName: "Western Alliance", city: "Phoenix", state: "AZ", kind: "bank" },
  { routing: "122238420", name: "First Foundation Bank", shortName: "First Foundation", city: "Dallas", state: "TX", kind: "bank" },
  { routing: "122203950", name: "Cathay Bank", shortName: "Cathay Bank", city: "Los Angeles", state: "CA", kind: "bank" },
  { routing: "321175261", name: "Golden 1 Credit Union", shortName: "Golden 1", city: "Sacramento", state: "CA", kind: "credit-union" },
  { routing: "322282603", name: "SchoolsFirst Federal Credit Union", shortName: "SchoolsFirst", city: "Santa Ana", state: "CA", kind: "credit-union" },
  { routing: "325081403", name: "Boeing Employees' Credit Union", shortName: "BECU", city: "Tukwila", state: "WA", kind: "credit-union" },
  { routing: "321076470", name: "Patelco Credit Union", shortName: "Patelco", city: "Dublin", state: "CA", kind: "credit-union" },
  { routing: "256074974", name: "Navy Federal Credit Union", shortName: "Navy Federal", city: "Vienna", state: "VA", kind: "credit-union" },
  { routing: "321180379", name: "First Technology Federal Credit Union", shortName: "First Tech", city: "San Jose", state: "CA", kind: "credit-union" },
];

/* ABA checksum: 3(d1+d4+d7) + 7(d2+d5+d8) + (d3+d6+d9) ≡ 0 (mod 10).
 * Catches a transposed digit before it becomes an unmatched statement next
 * month. Offline, instant, and the reason the routing-number path can lead. */
export function isValidRouting(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 9) return false;
  const d = digits.split("").map(Number);
  const sum =
    3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8]);
  return sum % 10 === 0;
}

export function lookupByRouting(value: string): Institution | undefined {
  const digits = value.replace(/\D/g, "");
  return institutions.find((i) => i.routing === digits);
}

/* Search accepts either shape the user might have in hand: a name fragment, or
 * digits off the statement. Digit queries match by routing prefix so partial
 * entry narrows as you type; text queries match legal name, short name, and
 * city — city matters because "First National Bank" is a dozen institutions and
 * the city is what tells them apart. */
export function searchInstitutions(query: string, limit = 8): Institution[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  const digits = q.replace(/\D/g, "");
  if (digits.length > 0 && /^[\d\s-]+$/.test(q)) {
    return institutions
      .filter((i) => i.routing.startsWith(digits))
      .slice(0, limit);
  }

  const scored = institutions
    .map((i) => {
      const short = i.shortName.toLowerCase();
      const name = i.name.toLowerCase();
      const city = i.city.toLowerCase();
      let score = -1;
      if (short.startsWith(q)) score = 0;
      else if (name.startsWith(q)) score = 1;
      else if (short.includes(q)) score = 2;
      else if (name.includes(q)) score = 3;
      else if (city.startsWith(q)) score = 4;
      return { i, score };
    })
    .filter((r) => r.score >= 0)
    .sort((a, b) => a.score - b.score || a.i.shortName.localeCompare(b.i.shortName));

  return scored.slice(0, limit).map((r) => r.i);
}

/* Monogram fallback. Institution identity must render without a logo asset,
 * so every bank gets initials on a deterministic tint derived from its routing
 * number — stable across renders, and distinct enough that two banks in the
 * same list don't read as the same tile. */
const MONOGRAM_TINTS = [
  { bg: "#E8EBFF", fg: "#2A3A8F" },
  { bg: "#E4F1EC", fg: "#1F5C48" },
  { bg: "#F6E9E4", fg: "#8A4326" },
  { bg: "#EDE8F5", fg: "#4C3A7A" },
  { bg: "#E6F0F6", fg: "#26586F" },
  { bg: "#F3EDDF", fg: "#6B5420" },
];

export function monogramFor(inst: Pick<Institution, "shortName" | "routing">) {
  const words = inst.shortName
    .replace(/[^A-Za-z0-9 &]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  const initials =
    words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : inst.shortName.slice(0, 2).toUpperCase();
  const seed = Number(inst.routing.slice(-2)) || 0;
  return { initials, ...MONOGRAM_TINTS[seed % MONOGRAM_TINTS.length] };
}

/* Account purposes. Open-ended in the real product — portfolios carry custom
 * ones — but these six cover what a property SPV actually holds. */
export const ACCOUNT_PURPOSES = [
  "Operating",
  "Reserve",
  "Escrow",
  "Security Deposit",
  "Construction",
  "CapEx",
] as const;
