// PBS release timestamps must mean the same instant on every server.
//
// THE DEFECT THESE TESTS EXIST TO CATCH
// PBS's WordPress API returns `date` as the site's LOCAL time with no UTC
// offset ("2026-11-06T13:00:06", Karachi) and `date_gmt` as UTC ("...T08:00:06").
// news.ts used `date` as is, so `new Date(...)` read it in the SERVER's
// timezone: right on a machine set to Pakistan time, five hours wrong on Vercel
// (UTC). In production that (a) made a just-published release look like it was
// from the future, so the Overview's freshness guard dropped it from Latest
// News, and (b) made the headline list show it five hours late. It went
// unnoticed because the development machine runs in Pakistan time.
//
// So these tests deliberately run under several timezones, including UTC, and
// assert on the INSTANT a timestamp denotes, not on how it is formatted.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getNews } from "./news";
import { selectFreshHeadlines } from "../headlineSelection";

const EMPTY_RSS = `<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>`;

/** Stub the network: PBS returns the given posts, every other source returns an empty feed. */
function stubNetwork(posts: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.includes("pbs.gov.pk/wp-json")) {
        return new Response(JSON.stringify(posts), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(EMPTY_RSS, { status: 200 });
    }),
  );
}

async function pbsItems() {
  const items = await getNews();
  return items.filter((i) => i.source === "PBS Official Releases");
}

const post = (over: Record<string, unknown> = {}) => ({
  title: { rendered: "Weekly Sensitive Price Indicator (SPI) for the week ended on 05-11-2026" },
  link: "https://www.pbs.gov.pk/example-spi/",
  date: "2026-11-06T13:00:06", // Karachi local, no offset — as the live API returns it
  date_gmt: "2026-11-06T08:00:06", // the same instant in UTC
  ...over,
});

const TRUE_INSTANT = Date.parse("2026-11-06T08:00:06Z");

// Timezones spanning UTC, Pakistan, and both sides of the date line.
const ZONES = ["UTC", "Asia/Karachi", "America/Los_Angeles", "Pacific/Auckland"];

let savedTz: string | undefined;
beforeEach(() => {
  savedTz = process.env.TZ;
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  if (savedTz === undefined) delete process.env.TZ;
  else process.env.TZ = savedTz;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("a PBS release denotes the same instant on every server", () => {
  it.each(ZONES)("under TZ=%s", async (tz) => {
    process.env.TZ = tz;
    stubNetwork([post()]);
    const [item] = await pbsItems();
    expect(item, "PBS item missing from getNews()").toBeDefined();
    // 13:00 in Karachi is 08:00 UTC — never 13:00 UTC.
    expect(Date.parse(item.publishedAt)).toBe(TRUE_INSTANT);
  });

  it("carries an explicit timezone designator, not a bare local time", () => {
    process.env.TZ = "UTC";
    stubNetwork([post()]);
    return pbsItems().then(([item]) => {
      expect(item.publishedAt).toMatch(/(Z|[+-]\d{2}:\d{2})$/);
    });
  });

  it("uses date_gmt when it is available", async () => {
    process.env.TZ = "UTC";
    // Deliberately inconsistent: if the code trusted `date`, this would differ.
    stubNetwork([post({ date: "2026-11-06T23:59:59", date_gmt: "2026-11-06T08:00:06" })]);
    const [item] = await pbsItems();
    expect(Date.parse(item.publishedAt)).toBe(TRUE_INSTANT);
  });
});

describe("when date_gmt is missing", () => {
  it.each(ZONES)("falls back to the local date as Pakistan time under TZ=%s", async (tz) => {
    process.env.TZ = tz;
    stubNetwork([post({ date_gmt: undefined })]);
    const [item] = await pbsItems();
    // Pakistan has no DST, so 13:00 local is exactly 08:00 UTC.
    expect(Date.parse(item.publishedAt)).toBe(TRUE_INSTANT);
  });

  it("leaves a value that already carries an offset alone", async () => {
    process.env.TZ = "UTC";
    stubNetwork([post({ date: "2026-11-06T08:00:06Z", date_gmt: undefined })]);
    const [item] = await pbsItems();
    expect(item.publishedAt).toBe("2026-11-06T08:00:06Z");
  });
});

describe("the incident: a fresh release must reach the Latest News panel on a UTC server", () => {
  /** A PBS post published `hoursAgo` hours before now, in both of WordPress's formats. */
  function freshPost(hoursAgo: number) {
    const gmt = new Date(Date.now() - hoursAgo * 3_600_000);
    const iso = (d: Date) => d.toISOString().slice(0, 19);
    const local = new Date(gmt.getTime() + 5 * 3_600_000); // Karachi = UTC+5
    return post({ date: iso(local), date_gmt: iso(gmt) });
  }

  it.each([0.5, 2, 3.5])("a release published %s hours ago is shown, not dropped as future-dated", async (hoursAgo) => {
    process.env.TZ = "UTC";
    stubNetwork([freshPost(hoursAgo)]);
    const items = await getNews();
    const panel = selectFreshHeadlines(items, Date.now());
    // Before the fix this was empty under UTC: the release parsed as up to 5h ahead of now.
    expect(panel.items.some((i) => i.source === "PBS Official Releases")).toBe(true);
    expect(panel.droppedUndated).toBe(0);
  });

  it("is judged identically under Pakistan time", async () => {
    process.env.TZ = "Asia/Karachi";
    stubNetwork([freshPost(2)]);
    const panel = selectFreshHeadlines(await getNews(), Date.now());
    expect(panel.items.some((i) => i.source === "PBS Official Releases")).toBe(true);
  });

  it("reports the true age, not a negative one", async () => {
    process.env.TZ = "UTC";
    stubNetwork([freshPost(3)]);
    const [item] = await pbsItems();
    const ageHours = (Date.now() - Date.parse(item.publishedAt)) / 3_600_000;
    expect(ageHours).toBeGreaterThan(2.9);
    expect(ageHours).toBeLessThan(3.1);
  });
});

describe("nothing else about a PBS item changed", () => {
  it("keeps title, link, source, category and the maximum relevance", async () => {
    process.env.TZ = "UTC";
    stubNetwork([post()]);
    const [item] = await pbsItems();
    expect(item.title).toContain("Weekly Sensitive Price Indicator");
    expect(item.url).toBe("https://www.pbs.gov.pk/example-spi/");
    expect(item.category).toBe("Pakistan Economy");
    expect(item.relevanceScore).toBe(10);
  });
});
