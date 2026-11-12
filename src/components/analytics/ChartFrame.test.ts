// ChartFrame leads with the first sentence of its "how to read" text and keeps the rest one click away. Progressive disclosure must never remove text:
// everything stays in the markup (readable without JavaScript, searchable, crawlable).

import { createElement, type ComponentProps, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChartFrame, splitLead } from "./ChartFrame";
import { Disclosure, FaqAccordion } from "@/components/shell/Disclosure";

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

// createElement's overloads insist on children inside the props object (which the react/no-children-prop rule forbids); these views of the components take
// their children as the usual extra argument.
const Frame = ChartFrame as unknown as ComponentType<Omit<ComponentProps<typeof ChartFrame>, "children">>;
const Disc = Disclosure as unknown as ComponentType<Omit<ComponentProps<typeof Disclosure>, "children">>;

describe("splitLead", () => {
  it("splits a multi-sentence explanation into its first sentence and the rest", () => {
    const { lead, rest } = splitLead("Each bar is one month of inflation. Gaps mean the month was not published. Values are percentages.");
    expect(lead).toBe("Each bar is one month of inflation.");
    expect(rest).toBe("Gaps mean the month was not published. Values are percentages.");
  });

  it("leaves a one-sentence explanation whole", () => {
    const text = "The SBP policy rate (stepped) and the US effective federal funds rate (monthly), both percentages.";
    expect(splitLead(text)).toEqual({ lead: text, rest: null });
  });

  it("does not split after an abbreviation", () => {
    const { lead } = splitLead("Compare series that move together, e.g. policy rate and yields, over the same dates. Then read the gap.");
    expect(lead.endsWith("e.g.")).toBe(false);
  });

  it("does not split a short opening fragment", () => {
    expect(splitLead("Percent. Read left to right.").rest).toBeNull();
  });

  it("loses no text: lead and rest rejoin to the original", () => {
    const text = "Pakistan's policy rate minus the US federal funds rate, in percentage points. In Oct 2026 the gap was +7.5 pp. Months present in both series only.";
    const { lead, rest } = splitLead(text);
    expect(`${lead} ${rest}`).toBe(text);
  });
});

describe("ChartFrame how-to-read", () => {
  const frame = (howToRead: string) =>
    html(createElement(Frame, { title: "Chart", howToRead, source: "Source: test" }, createElement("div", null, "plot")));

  it("shows the first sentence and puts the remainder behind a More disclosure that is still in the markup", () => {
    const out = frame("A bar is a month of data. A missing bar means the month is missing, not zero. Units are percent.");
    expect(out).toContain("A bar is a month of data.");
    expect(out).toContain("<summary");
    expect(out).toContain("More");
    expect(out).toContain("A missing bar means the month is missing, not zero. Units are percent.");
    // The detail is inside a closed <details>, not part of the always-visible paragraph.
    expect(out).toMatch(/<p[^>]*>A bar is a month of data\.<\/p><details/);
    expect(out).not.toMatch(/<details[^>]*open/);
  });

  it("has no disclosure when the explanation is a single sentence", () => {
    const out = frame("Percent per annum, one point per auction.");
    expect(out).not.toContain(">More<");
    expect(out).toContain("Percent per annum, one point per auction.");
  });

  it("never drops the source line", () => {
    expect(frame("One sentence is enough here for a chart.")).toContain("Source: test");
  });

  it("renders non-string explanations unchanged", () => {
    const out = html(createElement(Frame, { title: "T", howToRead: createElement("strong", null, "Read me. Then this.") }, createElement("div")));
    expect(out).toContain("<strong>Read me. Then this.</strong>");
    expect(out).not.toContain(">More<");
  });
});

describe("Disclosure and FaqAccordion", () => {
  it("Disclosure keeps its content in the markup and closed by default", () => {
    const out = html(createElement(Disc, { summary: "Definitions" }, "Cut-off is the highest accepted yield."));
    expect(out).toContain("Definitions");
    expect(out).toContain("Cut-off is the highest accepted yield.");
    expect(out).not.toMatch(/<details[^>]*\sopen/);
  });

  it("Disclosure can start open", () => {
    expect(html(createElement(Disc, { summary: "S", defaultOpen: true }, "x"))).toMatch(/<details[^>]*\sopen/);
  });

  it("FaqAccordion shows each question and holds every answer in the markup", () => {
    const out = html(
      createElement(FaqAccordion, {
        items: [
          { question: "What is a PIB?", answer: "A fixed-coupon bond." },
          { question: "What is a T-bill?", answer: "A discount security." },
        ],
      }),
    );
    expect((out.match(/<details/g) ?? []).length).toBe(2);
    for (const t of ["What is a PIB?", "A fixed-coupon bond.", "What is a T-bill?", "A discount security."]) expect(out).toContain(t);
  });
});
