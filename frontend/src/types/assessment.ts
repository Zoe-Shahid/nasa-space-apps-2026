// Proposed assessment shapes, not yet confirmed with the backend team. See docs/backend-contract-notes.md.
// The backend is the only source of status, coverage, rules and counts. The browser renders what it receives.
// Anything optional or null is shown as "Not provided by the backend", never guessed.

export interface AssessmentDetail {
  astronaut: { id: string; displayName: string }
  /** ISO 8601 UTC. */
  evaluatedAt: string
  /** For example "AX1". */
  contractVersion?: string | null
  /** For example "DEMO1". */
  rulesVersion?: string | null
  overallStatus: string
  overallCoverage: string
  /** Counts supplied by the backend. Never derived from the domain list in the browser. */
  unresolved?: { attention: number; urgent: number } | null
  domains: DomainDetail[]
}

export interface DomainDetail {
  /** Proposed keys: cardiovascular, sleep, wellbeing, bone_muscle, immune, radiation. */
  domain: string
  status: string
  coverage: string
  /** Backend-written reason. */
  reason?: string | null
  ruleIds?: string[]
  /** Observed records, in the backend's words. */
  observed?: string | null
  /** Comparison or logic summary, in the backend's words. */
  comparison?: string | null
  /** In the backend's words, for example "None for MS1. MS2 has no log in the last 24 hours." */
  missingInputs?: string | null
  /** ISO 8601 UTC. */
  latestRecordAt?: string | null
  nextReviewStep?: string | null
  /** Individual rule outcomes, where supplied. */
  ruleResults?: Array<{ ruleId: string; status: string }> | null
}

export interface AssessmentRefreshResult {
  assessment: AssessmentDetail
  message?: string
}
