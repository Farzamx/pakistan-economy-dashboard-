import type { GlossaryTerm } from "@/lib/academy/glossary/types";
import { cpiTerm } from "@/lib/academy/glossary/terms/cpi";
import { inflationTerm } from "@/lib/academy/glossary/terms/inflation";
import { gdpTerm } from "@/lib/academy/glossary/terms/gdp";
import { policyRateTerm } from "@/lib/academy/glossary/terms/policyRate";
import { fiscalDeficitTerm } from "@/lib/academy/glossary/terms/fiscalDeficit";
import { coreInflationTerm } from "@/lib/academy/glossary/terms/coreInflation";
import { currentAccountTerm } from "@/lib/academy/glossary/terms/currentAccount";
import { remittancesTerm } from "@/lib/academy/glossary/terms/remittances";
import { tbillsTerm } from "@/lib/academy/glossary/terms/tbills";
import { forexReservesTerm } from "@/lib/academy/glossary/terms/forexReserves";
import { imfTerm } from "@/lib/academy/glossary/terms/imf";

export const ALL_GLOSSARY_TERMS: GlossaryTerm[] = [
  cpiTerm,
  inflationTerm,
  gdpTerm,
  policyRateTerm,
  fiscalDeficitTerm,
  coreInflationTerm,
  currentAccountTerm,
  remittancesTerm,
  tbillsTerm,
  forexReservesTerm,
  imfTerm,
];

export function getTermBySlug(slug: string): GlossaryTerm | undefined {
  return ALL_GLOSSARY_TERMS.find((t) => t.slug === slug);
}

export function searchTerms(query: string): GlossaryTerm[] {
  if (!query.trim()) return ALL_GLOSSARY_TERMS;
  const q = query.toLowerCase().trim();
  return ALL_GLOSSARY_TERMS.filter(
    (t) =>
      t.term.en.toLowerCase().includes(q) ||
      t.term.ur.includes(q) ||
      t.term.rm.toLowerCase().includes(q) ||
      (t.abbreviation?.toLowerCase().includes(q) ?? false) ||
      t.definition.en.toLowerCase().includes(q),
  );
}

export function getTermsByCategory(category: string): GlossaryTerm[] {
  return ALL_GLOSSARY_TERMS.filter((t) => t.category === category);
}
