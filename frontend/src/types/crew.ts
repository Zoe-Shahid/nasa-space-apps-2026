// Legacy page/view models only. AX1 does not define crew wire schemas or routes, so these must not be used
// as API request or response types.

export interface CrewProfileSummary {
  id: string
  /** Alias or display name. */
  displayName: string
  /** YYYY-MM-DD, or null when not supplied. */
  missionStart: string | null
  /** Null before mission start or when not supplied. Never defaulted to 0. */
  missionDay: number | null
  /** Backend wording such as "Pre-mission", shown as supplied. */
  missionPhaseLabel: string | null
}

export interface CrewProfileDetail extends CrewProfileSummary {
  createdAt?: string | null
  reviewer?: string | null
  baselines?: Array<{ label: string; version: string; active: boolean }>
  radiationStream?: { configured: boolean; label?: string | null } | null
  /** Loaded records only. Must not contain check-in notes or other private text. */
  recentMeasurements: MeasurementWire[]
  latestAssessment: ProfileAssessment | null
}

export interface MeasurementWire {
  id: string
  kind: string
  recordedAt: string
  /** UTC reporting date (YYYY-MM-DD), for daily values such as sleep. */
  reportingDate?: string
  value?: number
  systolic?: number
  diastolic?: number
  totalHours?: number
  unit?: string
  /** Resting, Exercise, Oral, Includes naps ... as supplied. */
  context?: string | null
  /** Wire quality, expected valid or suspect. */
  quality: string
}

export interface ProfileAssessment {
  evaluatedAt: string
  overallStatus: string
  overallCoverage: string
  domains: Array<{ domain: string; status: string }>
}
