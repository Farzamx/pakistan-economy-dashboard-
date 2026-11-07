// JSON-LD for an indicator page: a FAQPage plus a BreadcrumbList.
//
// This is the same graph SeoPageLayout builds inline for the 38 template pages.
// The upgraded Inflation page does not use that template (it needs a wider,
// multi-section layout) but must keep emitting exactly the same structured data,
// so it is built here. seoStructuredData.test.ts renders the real SeoPageLayout
// and asserts the two outputs are identical, so they cannot drift apart.

import { SITE_URL } from "@/lib/seoConfig";

export interface FaqEntry {
  question: string;
  answer: string;
}

export function indicatorJsonLd(args: { title: string; canonicalPath: string; faq: readonly FaqEntry[] }) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        mainEntity: args.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Pakistan Economic Intelligence", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: args.title, item: `${SITE_URL}${args.canonicalPath}` },
        ],
      },
    ],
  };
}

/** The exact string SeoPageLayout embeds: `<` escaped so the JSON cannot close its own <script>. */
export function serializeJsonLd(graph: object): string {
  return JSON.stringify(graph).replace(/</g, "\\u003c");
}
