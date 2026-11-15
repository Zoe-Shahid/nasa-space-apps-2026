import { DOMAINS, sameDomain } from './domains'
import type { AssessmentSummary, LatestReadings } from '../types/overview'

export interface OverviewDomainReading {
  label: string
  value: string
  recordedAt: string
}

export interface OverviewDomainCard {
  key: string
  label: string
  status: string | null
  coverage: string | null
  latestRecordAt: string | null
  readings: OverviewDomainReading[]
  assessmentDetail: string | null
  privateDetailsHidden: boolean
}

export function overviewDomainCards(assessment: AssessmentSummary | null, latestReadings: LatestReadings): OverviewDomainCard[] {
  return DOMAINS.map((domain) => {
    const detail = assessment?.domains.find((item) => sameDomain(item.domain, domain.key))
    const readings: OverviewDomainReading[] = []

    if (domain.key === 'cardiovascular') {
      if (latestReadings.heartRate) {
        readings.push({
          label: 'Heart rate',
          value: `${latestReadings.heartRate.value} ${latestReadings.heartRate.unit}`.trim(),
          recordedAt: latestReadings.heartRate.recordedAt,
        })
      }
      if (latestReadings.bloodPressure) {
        readings.push({
          label: 'Blood pressure',
          value: `${latestReadings.bloodPressure.systolic}/${latestReadings.bloodPressure.diastolic} ${latestReadings.bloodPressure.unit}`.trim(),
          recordedAt: latestReadings.bloodPressure.recordedAt,
        })
      }
    } else if (domain.key === 'sleep_fatigue' && latestReadings.sleepTotal) {
      readings.push({
        label: 'Sleep total',
        value: `${latestReadings.sleepTotal.totalHours} ${latestReadings.sleepTotal.unit}`.trim(),
        recordedAt: latestReadings.sleepTotal.recordedAt,
      })
    }

    const privateDetailsHidden = domain.key === 'psychological'
    return {
      key: domain.key,
      label: domain.fullLabel,
      status: detail?.status ?? null,
      coverage: detail?.coverage ?? null,
      latestRecordAt: detail?.latestRecordAt ?? null,
      readings,
      assessmentDetail: privateDetailsHidden ? null : detail?.explanation ?? null,
      privateDetailsHidden,
    }
  })
}
