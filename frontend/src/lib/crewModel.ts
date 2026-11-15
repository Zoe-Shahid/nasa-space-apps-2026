import type { CrewProfileDetail, CrewProfileSummary, MeasurementWire } from '../types/crew'
import { formatUtcDayMonthYear, formatUtcShortNoZone } from './time'

export type Quality = 'valid' | 'suspect'

export function parseQuality(value: unknown): Quality | null {
  return value === 'valid' || value === 'suspect' ? value : null
}

export function filterProfiles(profiles: CrewProfileSummary[], query: string): CrewProfileSummary[] {
  const needle = query.trim().toLocaleLowerCase()
  return needle ? profiles.filter((profile) => profile.displayName.toLocaleLowerCase().includes(needle)) : profiles
}

export function missionText(profile: CrewProfileSummary): string | null {
  if (profile.missionPhaseLabel) return profile.missionPhaseLabel
  if (profile.missionDay !== null) return `Mission day ${profile.missionDay}`
  if (profile.missionStart) return `Mission start ${formatUtcDayMonthYear(profile.missionStart) ?? profile.missionStart} (UTC)`
  return null
}

export function avatarTone(id: string): string {
  const hash = [...id].reduce((total, char) => total + char.charCodeAt(0), 0)
  return `tone-${hash % 5 + 1}`
}

export function profileSubtitle(profile: CrewProfileDetail): string {
  return [profile.missionPhaseLabel, profile.missionDay !== null ? `Mission day ${profile.missionDay}` : null, profile.missionStart ? `Started ${formatUtcDayMonthYear(profile.missionStart)} (UTC)` : null]
    .filter((part): part is string => Boolean(part))
    .join(' · ') || 'Crew profile'
}

export interface MeasurementRow {
  id: string
  timeText: string
  metric: string
  valueText: string
  context: string
  quality: string
}

function metricText(kind: string): string {
  switch (kind) {
    case 'heart_rate': return 'Heart rate'
    case 'blood_pressure': return 'Blood pressure'
    case 'temperature': return 'Temperature'
    case 'sleep_total': return 'Sleep'
    default: return 'Unsupported record'
  }
}

function measurementValue(record: MeasurementWire): string {
  switch (record.kind) {
    case 'blood_pressure':
      return record.systolic === undefined || record.diastolic === undefined ? 'Not provided' : `${record.systolic}/${record.diastolic}${record.unit ? ` ${record.unit}` : ''}`
    case 'sleep_total':
      return record.totalHours === undefined ? 'Not provided' : `${record.totalHours}${record.unit ? ` ${record.unit}` : ''}`
    case 'heart_rate':
    case 'temperature':
      return record.value === undefined ? 'Not provided' : `${record.value}${record.unit ? ` ${record.unit}` : ''}`
    default:
      return 'Unsupported format'
  }
}

export function measurementRows(records: MeasurementWire[]): MeasurementRow[] {
  return records.map((record) => ({
    id: record.id,
    timeText: formatUtcShortNoZone(record.recordedAt),
    metric: metricText(record.kind),
    valueText: measurementValue(record),
    context: record.context ?? 'Not provided',
    quality: record.quality,
  }))
}
