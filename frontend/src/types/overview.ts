// Proposed overview shapes, not yet confirmed with the backend team.
//
// No API specification, endpoint list or OpenAPI document has been supplied to the frontend. These types describe
// the fields the Overview screen needs so the backend team can confirm, rename or reject them. Nothing here is
// called against a live server. See docs/backend-contract-notes.md.
//
// Wire values are typed as `string` on purpose: status, coverage and domain keys are validated at render time, and
// an unknown value is shown as "Unsupported format", never as Normal.

export interface OverviewResponse {
  astronaut: OverviewAstronaut
  /** Null when no assessment has been evaluated for this profile yet. */
  assessment: AssessmentSummary | null
  latestReadings: LatestReadings
  /** Null when the backend has no trend for this profile. */
  restingHeartRateTrend: HeartRateTrend | null
  /** Records loaded for this page only. Not a mission timeline. Must not contain check-in notes. */
  recentRecords: RecentRecordWire[]
}

export interface OverviewAstronaut {
  id: string
  displayName: string
  /** Null before mission start or when not reported. Never defaulted to 0. */
  missionDay: number | null
}

export interface AssessmentSummary {
  /** ISO 8601 UTC. */
  evaluatedAt: string
  overallStatus: string
  overallCoverage: string
  domains: DomainAssessment[]
  unresolvedConcerns: UnresolvedConcern[]
}

export interface DomainAssessment {
  /** Proposed keys: cardiovascular, sleep, wellbeing, bone_muscle, immune, radiation. */
  domain: string
  status: string
  coverage: string
  /** Plain-language reason written by the backend. */
  explanation: string
  /** Empty when the backend reports no rule for this domain. */
  ruleIds: string[]
  /** ISO 8601 UTC, or null when no relevant record exists. */
  latestRecordAt: string | null
  nextReviewStep: string | null
}

export interface UnresolvedConcern {
  domain: string
  ruleId: string
  status: string
  summary: string
}

export interface LatestReadings {
  heartRate: ScalarReading | null
  bloodPressure: BloodPressureReading | null
  temperature: ScalarReading | null
  sleepTotal: SleepReading | null
}

export interface ScalarReading {
  value: number
  unit: string
  recordedAt: string
}

export interface BloodPressureReading {
  systolic: number
  diastolic: number
  unit: string
  recordedAt: string
}

export interface SleepReading {
  totalHours: number
  unit: string
  /** UTC reporting date, YYYY-MM-DD. */
  reportingDate: string
  recordedAt: string
  includesNaps: boolean | null
}

/** Calculated by the backend. The browser only draws it. */
export interface HeartRateTrend {
  unit: string
  baseline: { version: string; value: number } | null
  /** One entry per UTC day in range, oldest first. dailyMean is null when the day has no valid resting reading. */
  days: Array<{ date: string; dailyMean: number | null }>
}

export interface RecentRecordWire {
  id: string
  /** Proposed: heart_rate, blood_pressure, temperature, sleep_total. Any other kind is not displayed. */
  kind: string
  recordedAt: string
  value?: number
  systolic?: number
  diastolic?: number
  totalHours?: number
  unit?: string
}
