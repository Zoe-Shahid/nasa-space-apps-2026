export interface DomainMeta {
  key: string
  aliases: string[]
  orbitLabel: string
  fullLabel: string
}

export const DOMAINS: DomainMeta[] = [
  { key: 'cardiovascular', aliases: [], orbitLabel: 'Cardiovascular', fullLabel: 'Cardiovascular' },
  { key: 'sleep_fatigue', aliases: ['sleep'], orbitLabel: 'Sleep', fullLabel: 'Sleep and Fatigue' },
  { key: 'psychological', aliases: ['wellbeing'], orbitLabel: 'Wellbeing', fullLabel: 'Psychological Wellbeing' },
  { key: 'musculoskeletal', aliases: ['bone_muscle'], orbitLabel: 'Bone & muscle', fullLabel: 'Bone and Muscle' },
  { key: 'immune', aliases: [], orbitLabel: 'Immune', fullLabel: 'Immune and Infection Concerns' },
  { key: 'radiation', aliases: [], orbitLabel: 'Radiation', fullLabel: 'Radiation Exposure' },
]

export const DOMAIN_LIMITS: Record<string, string> = {
  cardiovascular: 'Recorded pulse and blood pressure do not provide an ECG, diagnosis or fitness-for-duty assessment.',
  sleep_fatigue: 'Sleep duration, sleep quality and fatigue are distinct. A sleep total alone does not measure fatigue or a clinical sleep disorder.',
  psychological: 'Check-ins are self-reported context, not a diagnosis or mental-health assessment. Private notes do not belong in crew-wide views.',
  musculoskeletal: 'Exercise logs report completion only; they do not measure bone density, strength or fitness. Ordinary wearables do not measure bone density.',
  immune: 'Recorded symptoms and observations cannot confirm infection or measure immune function.',
  radiation: 'A configured, dedicated dosimetry stream reports recorded exposure only; ordinary wearables do not measure personal radiation dose.',
}

export function domainMeta(key: string): DomainMeta | undefined {
  return DOMAINS.find((domain) => domain.key === key || domain.aliases.includes(key))
}

export function sameDomain(left: string, right: string): boolean {
  const leftDomain = domainMeta(left)
  const rightDomain = domainMeta(right)
  return leftDomain && rightDomain ? leftDomain.key === rightDomain.key : left === right
}

export function domainFullLabel(key: string): string {
  return domainMeta(key)?.fullLabel ?? 'Unsupported domain'
}
