// The Inflation page's structured data must equal what the template it replaces
// emitted — checked against the REAL SeoPageLayout, not a copy of its logic.

import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { indicatorJsonLd, serializeJsonLd } from "./seoStructuredData";

const FAQ = [
  { question: "What is Pakistan's current inflation rate?", answer: "It is 9.6% </script><b>x</b> year-over-year." },
  { question: "How often is it released?", answer: "Monthly." },
];

function jsonLdFromTemplate(): string {
  const html = renderToStaticMarkup(
    createElement(SeoPageLayout, {
      title: "Pakistan Inflation Rate",
      subtitle: "s",
      kpiLabel: "k",
      kpiValue: "9.6%",
      chartTitle: "c",
      chartData: null,
      chartColor: "#000",
      chartUnit: "%",
      chartGradientId: "g",
      chartCaption: "cap",
      explanation: ["e"],
      whyItMatters: ["w"],
      faq: FAQ,
      relatedLinks: [],
      canonicalPath: "/inflation-rate-pakistan",
    }),
  );
  const m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
  if (!m) throw new Error("no JSON-LD found in template output");
  return m[1];
}

describe("indicatorJsonLd", () => {
  const graph = indicatorJsonLd({ title: "Pakistan Inflation Rate", canonicalPath: "/inflation-rate-pakistan", faq: FAQ });

  it("emits a FAQPage and a BreadcrumbList", () => {
    expect(graph["@graph"].map((n) => n["@type"])).toEqual(["FAQPage", "BreadcrumbList"]);
  });

  it("is byte-identical to the structured data SeoPageLayout renders", () => {
    // SeoPageLayout embeds its JSON via dangerouslySetInnerHTML, so the markup holds it verbatim.
    expect(serializeJsonLd(graph)).toBe(jsonLdFromTemplate());
  });

  it("the comparison is sensitive: a changed FAQ answer changes the output", () => {
    const other = indicatorJsonLd({ title: "Pakistan Inflation Rate", canonicalPath: "/inflation-rate-pakistan", faq: [{ ...FAQ[0], answer: "different" }, FAQ[1]] });
    expect(serializeJsonLd(other)).not.toBe(jsonLdFromTemplate());
  });

  it("escapes `<` so an answer can never close the script element", () => {
    const s = serializeJsonLd(graph);
    expect(s).not.toContain("</script>");
    expect(s).toContain("\\u003c/script>");
  });
});
