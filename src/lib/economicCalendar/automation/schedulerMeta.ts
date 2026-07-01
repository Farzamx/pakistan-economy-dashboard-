// Scheduler Metadata Detection — Phase 4 (Part 2: Scheduler Independence)
//
// Identifies which external scheduler triggered the sync endpoint from HTTP
// request headers. The sync pipeline itself has zero scheduler knowledge —
// this module is the only place scheduler-specific header names live.
//
// Detection priority:
//   1. x-scheduler-name (explicit override — any caller can self-identify)
//   2. Well-known platform headers (Vercel, GitHub Actions, Railway, Render)
//   3. User-Agent pattern matching (fallback for schedulers that don't set headers)
//   4. "unknown" — treated as an external caller, not an error
//
// Any scheduler that sets Authorization: Bearer ${CRON_SECRET} works without
// code changes. This module only affects WHAT IS LOGGED — not authentication.

export type SchedulerName =
  | "vercel"
  | "github-actions"
  | "railway"
  | "render"
  | "easycron"
  | "cron-job.org"
  | "gitlab"
  | "external"
  | "unknown";

export type TriggerType = "scheduled" | "manual" | "unknown";

export interface TriggerMeta {
  schedulerName: SchedulerName;
  triggerType: TriggerType;
  /** Platform-specific identifier for this specific invocation (e.g. Vercel deployment ID, GitHub run ID). */
  schedulerVersion: string | null;
  /** x-request-id or equivalent, for cross-referencing with platform logs. */
  requestId: string | null;
  authMethod: string;
}

/**
 * Detects the scheduler identity from HTTP request headers.
 * Pure function — no I/O, no side effects.
 *
 * External schedulers that don't match any known header can self-identify
 * by sending `x-scheduler-name: my-scheduler` (any value is accepted and
 * stored as "external") or `x-scheduler-name: github-actions` etc.
 */
export function detectTriggerMeta(headers: Headers, authMethod = "bearer-cron-secret"): TriggerMeta {
  const requestId =
    headers.get("x-request-id") ??
    headers.get("x-vercel-id") ??
    null;

  // Explicit caller override — highest priority.
  const explicitScheduler = headers.get("x-scheduler-name");
  if (explicitScheduler) {
    const known: SchedulerName[] = ["vercel", "github-actions", "railway", "render", "easycron", "cron-job.org", "gitlab", "external"];
    const name: SchedulerName = (known as string[]).includes(explicitScheduler)
      ? (explicitScheduler as SchedulerName)
      : "external";
    return {
      schedulerName: name,
      triggerType: (headers.get("x-trigger-type") as TriggerType | null) ?? "unknown",
      schedulerVersion: headers.get("x-scheduler-version") ?? null,
      requestId,
      authMethod,
    };
  }

  // Vercel: sends x-vercel-deployment-id on every serverless invocation.
  const vercelDeployId = headers.get("x-vercel-deployment-id");
  if (vercelDeployId) {
    return {
      schedulerName: "vercel",
      triggerType: "scheduled",
      schedulerVersion: vercelDeployId,
      requestId,
      authMethod,
    };
  }

  // GitHub Actions: sets x-github-workflow or x-github-run-id.
  const githubRunId = headers.get("x-github-run-id");
  const githubWorkflow = headers.get("x-github-workflow");
  if (githubRunId || githubWorkflow) {
    return {
      schedulerName: "github-actions",
      triggerType: "scheduled",
      schedulerVersion: githubRunId ?? githubWorkflow ?? null,
      requestId,
      authMethod,
    };
  }

  // Railway: includes "railway" in User-Agent.
  const ua = headers.get("user-agent") ?? "";
  if (/railway/i.test(ua)) {
    return {
      schedulerName: "railway",
      triggerType: "scheduled",
      schedulerVersion: null,
      requestId,
      authMethod,
    };
  }

  // Render: sets x-render-origin-region.
  if (headers.get("x-render-origin-region")) {
    return {
      schedulerName: "render",
      triggerType: "scheduled",
      schedulerVersion: headers.get("x-render-origin-region"),
      requestId,
      authMethod,
    };
  }

  // EasyCron: includes "EasyCron" in User-Agent.
  if (/easycron/i.test(ua)) {
    return {
      schedulerName: "easycron",
      triggerType: "scheduled",
      schedulerVersion: null,
      requestId,
      authMethod,
    };
  }

  // cron-job.org: includes "CronJob" in User-Agent.
  if (/cronjob/i.test(ua)) {
    return {
      schedulerName: "cron-job.org",
      triggerType: "scheduled",
      schedulerVersion: null,
      requestId,
      authMethod,
    };
  }

  // GitLab: sets x-gitlab-event or includes "GitLab" in User-Agent.
  if (headers.get("x-gitlab-event") || /gitlab/i.test(ua)) {
    return {
      schedulerName: "gitlab",
      triggerType: "scheduled",
      schedulerVersion: headers.get("x-gitlab-event") ?? null,
      requestId,
      authMethod,
    };
  }

  return {
    schedulerName: "unknown",
    triggerType: "unknown",
    schedulerVersion: ua || null,
    requestId,
    authMethod,
  };
}
