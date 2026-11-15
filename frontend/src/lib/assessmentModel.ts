import { DOMAINS, domainMeta, sameDomain } from './domains'
import type { AssessmentDetail, DomainDetail } from '../types/assessment'

export function domainRows(assessment: AssessmentDetail): Array<{ meta: NonNullable<ReturnType<typeof domainMeta>>; detail: DomainDetail | undefined }> {
  return DOMAINS.map((meta) => ({ meta, detail: assessment.domains.find((domain) => sameDomain(domain.domain, meta.key)) }))
}

export function initialDomain(value: string | null): string {
  return (value && domainMeta(value)?.key) || DOMAINS[0].key
}

export function supplied(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

export function unresolvedText(counts: AssessmentDetail['unresolved']): string | null {
  if (!counts || !Number.isFinite(counts.attention) || !Number.isFinite(counts.urgent)) return null
  return `${counts.attention} unresolved Attention and ${counts.urgent} unresolved Urgent ${counts.attention + counts.urgent === 1 ? 'concern' : 'concerns'}`
}

export function versionText(assessment: AssessmentDetail): string {
  const parts = [assessment.contractVersion && `Contract ${assessment.contractVersion}`, assessment.rulesVersion && `Rules ${assessment.rulesVersion}`].filter(Boolean)
  return parts.length ? ` · ${parts.join(' · ')}` : ''
}
