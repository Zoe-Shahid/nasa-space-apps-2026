// Canonical API values (lowercase) and UI labels. Status and coverage are separate concepts.
export const STATUS_VALUES = ['normal', 'attention', 'urgent', 'insufficient_data'] as const
export type Status = (typeof STATUS_VALUES)[number]

export const COVERAGE_VALUES = ['complete', 'partial', 'missing'] as const
export type Coverage = (typeof COVERAGE_VALUES)[number]

export const STATUS_LABEL: Record<Status, string> = {
  normal: 'Normal',
  attention: 'Attention',
  urgent: 'Urgent',
  insufficient_data: 'Insufficient Data',
}

export const COVERAGE_LABEL: Record<Coverage, string> = {
  complete: 'Complete',
  partial: 'Partial',
  missing: 'Missing',
}

/** Returns a known status, or null. Unknown values must never fall back to Normal. */
export function parseStatus(value: unknown): Status | null {
  return STATUS_VALUES.find((s) => s === value) ?? null
}

export function parseCoverage(value: unknown): Coverage | null {
  return COVERAGE_VALUES.find((c) => c === value) ?? null
}
