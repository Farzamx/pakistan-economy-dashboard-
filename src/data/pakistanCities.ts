// Major Pakistani cities PBS surveys for its Consumer Price Index / SPI —
// used to power the profile's City combobox (Section B3) so a selected
// city can auto-fill Province instead of leaving it an empty select.
// `province: null` means the city sits outside the 4-value Province enum
// this schema currently models (e.g. Islamabad, a federal territory, not
// a province) — deliberately left unmapped rather than force-fit into the
// nearest region, so the app never states an assumption as the user's data.
import type { Province } from "@/lib/decisionSupportLab/economicProfile";

export interface PakistanCity {
  name: string;
  province: Province | null;
}

const RAW_CITIES: PakistanCity[] = [
  { name: "Islamabad", province: null },
  // Punjab
  { name: "Lahore", province: "punjab" },
  { name: "Rawalpindi", province: "punjab" },
  { name: "Faisalabad", province: "punjab" },
  { name: "Multan", province: "punjab" },
  { name: "Gujranwala", province: "punjab" },
  { name: "Sialkot", province: "punjab" },
  { name: "Sargodha", province: "punjab" },
  { name: "Bahawalpur", province: "punjab" },
  { name: "Sahiwal", province: "punjab" },
  { name: "Gujrat", province: "punjab" },
  { name: "Jhang", province: "punjab" },
  { name: "Sheikhupura", province: "punjab" },
  { name: "Rahim Yar Khan", province: "punjab" },
  { name: "Dera Ghazi Khan", province: "punjab" },
  { name: "Kasur", province: "punjab" },
  { name: "Okara", province: "punjab" },
  { name: "Chiniot", province: "punjab" },
  { name: "Muzaffargarh", province: "punjab" },
  // Sindh
  { name: "Karachi", province: "sindh" },
  { name: "Hyderabad", province: "sindh" },
  { name: "Sukkur", province: "sindh" },
  { name: "Larkana", province: "sindh" },
  { name: "Shaheed Benazirabad", province: "sindh" },
  { name: "Mirpurkhas", province: "sindh" },
  { name: "Jacobabad", province: "sindh" },
  // Khyber Pakhtunkhwa
  { name: "Peshawar", province: "kp" },
  { name: "Mardan", province: "kp" },
  { name: "Abbottabad", province: "kp" },
  { name: "Kohat", province: "kp" },
  { name: "Dera Ismail Khan", province: "kp" },
  { name: "Bannu", province: "kp" },
  { name: "Swat (Mingora)", province: "kp" },
  // Balochistan
  { name: "Quetta", province: "balochistan" },
  { name: "Sibi", province: "balochistan" },
  { name: "Khuzdar", province: "balochistan" },
  { name: "Turbat", province: "balochistan" },
  { name: "Gwadar", province: "balochistan" },
];

export const PAKISTAN_CITIES: PakistanCity[] = [...RAW_CITIES].sort((a, b) => a.name.localeCompare(b.name));
