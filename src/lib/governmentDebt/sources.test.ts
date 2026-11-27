// The debt-source parsers on small hand-made inputs: the layout rules and every internal check that stops a wrong read.

import { describe, expect, it } from "vitest";
import { parseMofDebtReview, parseSummaryPdf, quarterLabelToDate } from "./sources";

describe("quarter labels", () => {
  it.each([["Sep-26", "2026-09-30"], ["Dec-25", "2025-12-31"], ["Mar-24", "2024-03-31"], ["Jun-09", "2009-06-30"]])("%s -> %s", (l, d) => {
    expect(quarterLabelToDate(l)).toBe(d);
  });
  it("rejects anything else", () => expect(() => quarterLabelToDate("FY26")).toThrow());
});

const SUMMARY = `Pakistan's Debt and Liabilities-Summary
(In Billion Rupees)
R R R R P
Sep-25 Dec-25 Mar-26 Jun-26 Sep-26
I. Gross Government Domestic Debt 7 53,426.7 55,369.7 57,571.7 59,393.9 57,757.7
II. Government External Debt 23,181.4 23,165.9 22,958.6 24,200.6 24,900.2
III. Debt from IMF 2,541.6 2,844.7 2,760.4 3,072.9 3,010.3
A. Gross Public Debt (sum I to III) 79,149.6 81,380.4 83,290.7 86,667.4 85,668.2
B. Total Debt of the Government - FRDLA Definition3
71,664.1 73,920.1 75,392.5 77,117.2 77,217.1
C. Total External Debt & Liabilities (sum II to VI+IX) 38,048.5 38,534.4 38,262.0 38,713.5 39,631.1
As percent of GDP
Gross Public Debt 68.6
Total Debt of the Government - FRDLA Definition 61.0
Total External Debt & Liabilities 30.6
Gross Government Domestic Debt 47.0
Memorandum Items FY26
GDP (current market price)4 126,360
Government Deposits with the banking system5 7,485 7,460 7,898 9,550 8,451
Total Debt and Liabilities (As percent of GDP) 78.9`;

describe("SBP Summary.pdf", () => {
  const s = parseSummaryPdf(SUMMARY);
  it("reads the quarters, the P/R flags and every row, skipping the footnote digit after a label", () => {
    expect(s.quarters).toEqual(["2025-09-30", "2025-12-31", "2026-03-31", "2026-06-30", "2026-09-30"]);
    expect(s.flags).toEqual(["R", "R", "R", "R", "P"]);
    expect(s.rows.domestic[0]).toBe(53426.7);
    expect(s.rows.frdla[4]).toBe(77217.1);
    expect(s.rows.govDeposits).toEqual([7485, 7460, 7898, 9550, 8451]);
  });
  it("reads the fiscal-year ratios and GDP", () => {
    expect(s.ratios).toEqual({ grossPublic: 68.6, frdla: 61, totalExternal: 30.6, domestic: 47, totalDebtLiabilities: 78.9 });
    expect([s.fiscalYear, s.gdp]).toEqual(["FY26", 126360]);
  });
  it("stops when a row is missing", () => {
    expect(() => parseSummaryPdf(SUMMARY.replace("III. Debt from IMF", "III. Something else"))).toThrow(/Debt from IMF/);
  });
});

const MOF = [
  "The total public debt of Pakistan is PKR 86,715 billion as of June-26, which is an increase of 7% Y/y. Out of this, an amount of PKR",
  "59,441 billion is domestic debt and PKR 27,274 billion is external debt.",
  "47,160 54,471 59,441",
  "24,086",
  "26,046",
  "27,274",
  "71,246",
  "80,517",
  "86,715",
  "J U N - 2 4 J U N - 2 5 J U N - 2 6",
  "T O T A L P U B L I C D E B T - P K R B I L L I O N",
  "Domestic Debt External Debt",
  "44.8% 47.8% 46.9%",
  "22.9% 22.8% 21.5%",
  "67.7% 70.6% 68.3%",
  "J U N - 2 4 J U N - 2 5 J U N - 2 6",
  "P U B L I C D E B T T O G D P R A T I O",
  "Jun-24 Jun-25 Jun-26",
  "Total Debt of the Govt - PKR bn 65,079 73,267 77,168",
  "Total Debt Govt - to - GDP Ratio 61.8% 64.2% 60.8%",
].join("\n");

describe("Ministry of Finance Annual Debt Review", () => {
  it("reads three fiscal years of stocks, ratios and the FRDLA measure", () => {
    expect(parseMofDebtReview(MOF)).toEqual([
      { date: "2024-06-30", totalPublic: 71246, domestic: 47160, external: 24086, totalPct: 67.7, domesticPct: 44.8, externalPct: 22.9, frdla: 65079, frdlaPct: 61.8 },
      { date: "2025-06-30", totalPublic: 80517, domestic: 54471, external: 26046, totalPct: 70.6, domesticPct: 47.8, externalPct: 22.8, frdla: 73267, frdlaPct: 64.2 },
      { date: "2026-06-30", totalPublic: 86715, domestic: 59441, external: 27274, totalPct: 68.3, domesticPct: 46.9, externalPct: 21.5, frdla: 77168, frdlaPct: 60.8 },
    ]);
  });
  it("stops when domestic + external does not equal the total (a misread chart)", () => {
    expect(() => parseMofDebtReview(MOF.replace("80,517", "80,518"))).toThrow(/!= total/);
  });
  it("stops when the narrative and the chart disagree", () => {
    expect(() => parseMofDebtReview(MOF.replace("PKR 86,715 billion as of", "PKR 86,716 billion as of"))).toThrow(/disagree/);
  });
  it("stops when the ratio components do not add up", () => {
    expect(() => parseMofDebtReview(MOF.replace("67.7% 70.6% 68.3%", "67.7% 70.6% 69.3%"))).toThrow(/ratio/);
  });
});
