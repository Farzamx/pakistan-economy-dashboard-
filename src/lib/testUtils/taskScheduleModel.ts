// A tiny reader and calendar for the Windows Task Scheduler XML this repository keeps under ops/scheduled-tasks/.
// Test support only. It understands exactly the trigger shapes those files use (CalendarTrigger with ScheduleByMonth /
// ScheduleByWeek) and REFUSES anything else, so a future edit that adds a trigger type it cannot evaluate fails loudly rather
// than being silently ignored by the tests.
//
// It never touches the operating system's scheduler: it only reads the XML text and does calendar arithmetic.

export interface TriggerModel {
  /** The wall-clock time of day, as written (the StartBoundary's own offset applies). */
  hour: number;
  minute: number;
  /** Wall-clock date from which the trigger is active, "YYYY-MM-DD". */
  startDate: string;
  /** Offset of the StartBoundary in minutes (PKT = +300). */
  offsetMinutes: number;
  months: number[];
  daysOfMonth: number[] | null;
  daysOfWeek: number[] | null; // 0 = Sunday
}

export interface TaskModel {
  triggers: TriggerModel[];
  settings: Record<string, string>;
  exec: { command: string; args: string; workingDirectory: string };
  hasRepetition: boolean;
  hasRestartOnFailure: boolean;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Throws unless the XML is balanced, well-ordered and free of the constructs XML forbids (e.g. "--" inside a comment). */
export function assertWellFormed(xml: string): void {
  const body = xml.replace(/^<\?xml[^>]*\?>\s*/, "");
  for (const c of body.matchAll(/<!--([\s\S]*?)-->/g)) {
    if (c[1].includes("--")) throw new Error("XML comment contains '--', which is not allowed");
  }
  const stripped = body.replace(/<!--[\s\S]*?-->/g, "");
  const stack: string[] = [];
  for (const m of stripped.matchAll(/<(\/?)([A-Za-z][\w:.-]*)([^>]*?)(\/?)>/g)) {
    const [, close, name, , selfClose] = m;
    if (selfClose) continue;
    if (close) {
      if (stack.pop() !== name) throw new Error(`XML is not balanced at </${name}>`);
    } else stack.push(name);
  }
  if (stack.length) throw new Error(`XML is not balanced: unclosed <${stack.at(-1)}>`);
}

const text = (xml: string, tag: string): string => new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml)?.[1].trim() ?? "";

export function parseTaskXml(xml: string): TaskModel {
  assertWellFormed(xml);
  const noComments = xml.replace(/<!--[\s\S]*?-->/g, "");
  const triggers: TriggerModel[] = [];
  const triggerBlocks = [...noComments.matchAll(/<(\w+Trigger)>([\s\S]*?)<\/\1>/g)];
  for (const [, kind, block] of triggerBlocks) {
    if (kind !== "CalendarTrigger") throw new Error(`unsupported trigger type ${kind}`);
    if (/<Repetition>/.test(block)) throw new Error("repetition is not modelled; the task must not poll");
    const sb = /<StartBoundary>(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):\d{2}([+-]\d{2}):(\d{2})<\/StartBoundary>/.exec(block);
    if (!sb) throw new Error("StartBoundary missing or not in the expected form");
    const sign = sb[4].startsWith("-") ? -1 : 1;
    const offsetMinutes = sign * (Math.abs(Number(sb[4])) * 60 + Number(sb[5]));
    const byMonth = /<ScheduleByMonth>([\s\S]*?)<\/ScheduleByMonth>/.exec(block);
    const byWeek = /<ScheduleByWeek>([\s\S]*?)<\/ScheduleByWeek>/.exec(block);
    if (!byMonth && !byWeek) throw new Error("only ScheduleByMonth / ScheduleByWeek are modelled");
    if (byWeek && !/<WeeksInterval>1<\/WeeksInterval>/.test(byWeek[1])) throw new Error("only WeeksInterval 1 is modelled");
    triggers.push({
      hour: Number(sb[2]),
      minute: Number(sb[3]),
      startDate: sb[1],
      offsetMinutes,
      months: byMonth ? MONTHS.map((m, i) => (new RegExp(`<${m}\\s*/>`).test(byMonth[1]) ? i + 1 : 0)).filter(Boolean) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      daysOfMonth: byMonth ? [...byMonth[1].matchAll(/<Day>(\d+)<\/Day>/g)].map((d) => Number(d[1])) : null,
      daysOfWeek: byWeek ? DOW.map((d, i) => (new RegExp(`<${d}\\s*/>`).test(byWeek[1]) ? i : -1)).filter((i) => i >= 0) : null,
    });
  }
  const settingsBlock = /<Settings>([\s\S]*?)<\/Settings>/.exec(noComments)?.[1] ?? "";
  const settings: Record<string, string> = {};
  for (const m of settingsBlock.matchAll(/<(\w+)>([^<]*)<\/\1>/g)) settings[m[1]] = m[2].trim();
  return {
    triggers,
    settings,
    exec: { command: text(noComments, "Command"), args: text(noComments, "Arguments"), workingDirectory: text(noComments, "WorkingDirectory") },
    hasRepetition: /<Repetition>/.test(noComments),
    hasRestartOnFailure: /<RestartOnFailure>/.test(noComments),
  };
}

const DAY_MS = 86_400_000;

/** Every instant (UTC) at which the task's triggers fire between `from` (inclusive) and `to` (exclusive), ascending. */
export function expandRuns(triggers: readonly TriggerModel[], from: Date, to: Date): Date[] {
  const out: number[] = [];
  for (const t of triggers) {
    // Walk wall-clock days of the trigger's own offset. A wall-clock day is represented as UTC midnight of that calendar date.
    const first = Math.floor((from.getTime() + t.offsetMinutes * 60_000) / DAY_MS) * DAY_MS - DAY_MS;
    for (let day = first; day <= to.getTime() + t.offsetMinutes * 60_000 + DAY_MS; day += DAY_MS) {
      const d = new Date(day);
      const ymd = d.toISOString().slice(0, 10);
      if (ymd < t.startDate) continue;
      if (!t.months.includes(d.getUTCMonth() + 1)) continue;
      if (t.daysOfMonth && !t.daysOfMonth.includes(d.getUTCDate())) continue;
      if (t.daysOfWeek && !t.daysOfWeek.includes(d.getUTCDay())) continue;
      const instant = day + (t.hour * 60 + t.minute) * 60_000 - t.offsetMinutes * 60_000;
      if (instant >= from.getTime() && instant < to.getTime()) out.push(instant);
    }
  }
  return [...new Set(out)].sort((a, b) => a - b).map((ms) => new Date(ms));
}

/** Milliseconds from `at` until the next run at or after it, or null if none falls before `horizon`. */
export function waitUntilNextRun(runs: readonly Date[], at: Date): number | null {
  const next = runs.find((r) => r.getTime() >= at.getTime());
  return next ? next.getTime() - at.getTime() : null;
}
