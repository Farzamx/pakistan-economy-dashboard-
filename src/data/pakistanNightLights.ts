// Data for the marketing hero's "night lights" background (see
// HeroBackground.tsx) — a decorative, code-generated SVG standing in for a
// satellite night-lights photo, per the "no image files" constraint.
//
// Coordinates are each city's real, approximate lat/lng (WGS84, decimal
// degrees). Population figures are ROUGH, ROUNDED approximations from
// general public knowledge, used ONLY to size each city's glow radius/
// opacity for a visually plausible light-density map — they are never
// displayed as data anywhere on the site and should not be treated as
// authoritative population statistics. Edit freely; this file has no
// effect on anything except the background's visual weighting.
export interface NightLightCity {
  name: string;
  lat: number;
  lng: number;
  /** Rough population, for glow sizing only — see file header. */
  population: number;
  /** Only the largest few cities render at full detail on the mobile crop (see HeroBackground.tsx's MOBILE_CITY_COUNT slice). */
}

export const PAKISTAN_NIGHT_LIGHTS: NightLightCity[] = [
  { name: "Karachi", lat: 24.8607, lng: 67.0011, population: 16000000 },
  { name: "Lahore", lat: 31.5497, lng: 74.3436, population: 13000000 },
  { name: "Faisalabad", lat: 31.4504, lng: 73.135, population: 3700000 },
  { name: "Rawalpindi", lat: 33.5651, lng: 73.0169, population: 2300000 },
  { name: "Islamabad", lat: 33.6844, lng: 73.0479, population: 1200000 },
  { name: "Gujranwala", lat: 32.1877, lng: 74.1945, population: 2200000 },
  { name: "Peshawar", lat: 34.0151, lng: 71.5249, population: 2000000 },
  { name: "Multan", lat: 30.1575, lng: 71.5249, population: 1900000 },
  { name: "Hyderabad", lat: 25.396, lng: 68.3578, population: 1700000 },
  { name: "Quetta", lat: 30.1798, lng: 66.975, population: 1000000 },
  { name: "Sialkot", lat: 32.4945, lng: 74.5229, population: 750000 },
  { name: "Bahawalpur", lat: 29.4, lng: 71.6833, population: 900000 },
  { name: "Sargodha", lat: 32.0836, lng: 72.6711, population: 700000 },
  { name: "Sukkur", lat: 27.7052, lng: 68.8574, population: 600000 },
  { name: "Larkana", lat: 27.559, lng: 68.2123, population: 500000 },
  { name: "Gilgit", lat: 35.9221, lng: 74.3087, population: 65000 },
  { name: "Muzaffarabad", lat: 34.37, lng: 73.4711, population: 150000 },
  { name: "Sheikhupura", lat: 31.713, lng: 73.9783, population: 700000 },
  { name: "Jhang", lat: 31.2781, lng: 72.3181, population: 400000 },
  { name: "Rahim Yar Khan", lat: 28.4212, lng: 70.2989, population: 450000 },
  { name: "Gujrat", lat: 32.574, lng: 74.0789, population: 400000 },
  { name: "Kasur", lat: 31.1156, lng: 74.4502, population: 350000 },
  { name: "Okara", lat: 30.8081, lng: 73.4459, population: 300000 },
  { name: "Mardan", lat: 34.1989, lng: 72.0404, population: 400000 },
  { name: "Mingora", lat: 34.7717, lng: 72.3604, population: 350000 },
  { name: "Dera Ghazi Khan", lat: 30.0561, lng: 70.6346, population: 450000 },
  { name: "Nawabshah", lat: 26.2442, lng: 68.41, population: 300000 },
  { name: "Sahiwal", lat: 30.6682, lng: 73.1114, population: 380000 },
  { name: "Mirpur Khas", lat: 25.5268, lng: 69.0113, population: 280000 },
  { name: "Chiniot", lat: 31.7292, lng: 72.9789, population: 300000 },
  { name: "Kamoke", lat: 31.975, lng: 74.2244, population: 200000 },
  { name: "Hafizabad", lat: 32.0713, lng: 73.6883, population: 200000 },
  { name: "Kohat", lat: 33.585, lng: 71.4419, population: 250000 },
  { name: "Abbottabad", lat: 34.1463, lng: 73.2117, population: 200000 },
  { name: "Dera Ismail Khan", lat: 31.8314, lng: 70.9012, population: 250000 },
  { name: "Khuzdar", lat: 27.8, lng: 66.6167, population: 180000 },
  { name: "Turbat", lat: 26.0031, lng: 63.048, population: 150000 },
  { name: "Chaman", lat: 30.9169, lng: 66.4597, population: 150000 },
  { name: "Zhob", lat: 31.3411, lng: 69.4481, population: 90000 },
  { name: "Skardu", lat: 35.2971, lng: 75.6333, population: 50000 },
  { name: "Chitral", lat: 35.8518, lng: 71.7861, population: 30000 },
  { name: "Attock", lat: 33.7666, lng: 72.3639, population: 200000 },
  { name: "Jacobabad", lat: 28.2769, lng: 68.4514, population: 200000 },
  { name: "Khairpur", lat: 27.5295, lng: 68.7592, population: 180000 },
  { name: "Wah Cantt", lat: 33.7969, lng: 72.7, population: 380000 },
  { name: "Sadiqabad", lat: 28.3082, lng: 70.129, population: 200000 },
  { name: "Muzaffargarh", lat: 30.0725, lng: 71.1932, population: 180000 },
];

/** Sorted largest-first so the mobile crop (see HeroBackground.tsx) can cheaply slice the top N without re-sorting there. */
export const PAKISTAN_NIGHT_LIGHTS_BY_SIZE = [...PAKISTAN_NIGHT_LIGHTS].sort((a, b) => b.population - a.population);
