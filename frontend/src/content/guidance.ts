// Research claims and links are retained from the team's approved reference. Prototype capabilities are stated
// according to the current screens and are not claims about a connected backend.

export interface Reference {
  id: string
  label: string
  url: string
}

export const REFERENCES: Reference[] = [
  { id: 'S1', label: 'NASA: Cardiovascular and Vision', url: 'https://www.nasa.gov/directorates/esdmd/hhp/cardiovascular-and-vision/' },
  { id: 'S2', label: 'Barger et al., Lancet Neurology 2014', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4188436/' },
  { id: 'S3', label: 'Flynn-Evans et al., npj Microgravity 2016', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5515517/' },
  { id: 'S4', label: 'Jones et al., Sleep 2022', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8919197/' },
  { id: 'S5', label: 'NASA: Behavioral Changes and Psychiatric Disorders', url: 'https://www.nasa.gov/reference/risk-of-behavioral-changes-and-psychiatric-disorders/' },
  { id: 'S6', label: 'NASA-STD-3001 Vol 1, Medical Operations', url: 'https://www.nasa.gov/reference/6-0-medical-operations/' },
  { id: 'S7', label: 'NASA: Spaceflight-Induced Bone Changes', url: 'https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/' },
  { id: 'S8', label: 'NASA: Bone and Mineral Evaluation', url: 'https://www.nasa.gov/directorates/esdmd/hhp/bone-and-mineral-evaluation-and-analysis/' },
  { id: 'S9', label: 'NASA: Altered Immune System Responses', url: 'https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/' },
  { id: 'S10', label: 'NASA: Space Radiation', url: 'https://www.nasa.gov/directorates/esdmd/hhp/space-radiation/' },
  { id: 'S11', label: 'ARPANSA: Units of ionising radiation', url: 'https://www.arpansa.gov.au/understanding-radiation/what-is-radiation/radiation/measurement' },
]

export interface ResearchArea {
  id: string
  title: string
  explanation: string
  whyItMatters: string
  monitors: string
  cannotEstablish: string
  refs: string[]
}

export const AREA_BLOCK_LABEL = {
  explanation: 'Explanation',
  whyItMatters: 'Why it matters during missions',
  monitors: 'What this MVP records',
  cannotEstablish: 'What available data cannot establish',
}

export const RESEARCH_AREAS: ResearchArea[] = [
  {
    id: 'cardiovascular',
    title: 'Cardiovascular',
    explanation: 'Microgravity shifts fluid toward the upper body. ECG, blood-pressure monitoring and ultrasound provide different information.',
    whyItMatters: 'Blood-pressure regulation can be harder on return to gravity.',
    monitors: 'Manual heart-rate and paired blood-pressure entries, owner-scoped history, and descriptive trends are supported. ECG and ultrasound data are not connected.',
    cannotEstablish: 'A pulse number cannot substitute for an ECG or ultrasound, and these records do not provide a diagnosis or fitness-for-duty assessment.',
    refs: ['S1'],
  },
  {
    id: 'sleep',
    title: 'Sleep and Fatigue',
    explanation: 'Sleep duration, sleep quality and fatigue are distinct. Studies of shuttle and ISS crews link short sleep with circadian misalignment.',
    whyItMatters: 'The cited studies also link short sleep with slower responses and greater stress.',
    monitors: 'Manual sleep-duration entry, owner-scoped history, and descriptive trends are supported. Sleep quality and fatigue are not collected.',
    cannotEstablish: 'Observational findings do not establish a universal cutoff or predict an individual result.',
    refs: ['S2', 'S3', 'S4'],
  },
  {
    id: 'wellbeing',
    title: 'Psychological Wellbeing',
    explanation: 'Isolation, confinement and workload can affect psychological wellbeing.',
    whyItMatters: 'These conditions are part of the mission environment described in the cited NASA materials.',
    monitors: 'Psychological check-ins and support requests are not supported. Actual account records are owner-scoped; this MVP has no shared private-detail view.',
    cannotEstablish: 'A check-in, low mood or interpersonal friction does not establish a disorder. AstroOrbitX provides no diagnosis or treatment.',
    refs: ['S5', 'S6'],
  },
  {
    id: 'bone-muscle',
    title: 'Bone and Muscle',
    explanation: 'Reduced mechanical loading in microgravity can contribute to deconditioning.',
    whyItMatters: 'Bone and muscle changes are identified in the cited NASA materials as spaceflight concerns.',
    monitors: 'Exercise, bone imaging, and strength-test records are not supported.',
    cannotEstablish: 'An exercise log or smartwatch does not measure bone density, muscle strength or fitness.',
    refs: ['S7', 'S8'],
  },
  {
    id: 'immune',
    title: 'Immune and Infection Concerns',
    explanation: 'Altered immune responses and events such as rashes, cold sores and infections have been reported in some astronauts.',
    whyItMatters: 'These reported events make immune and infection-related concerns relevant to mission health monitoring.',
    monitors: 'Manual body-temperature observations are supported. Symptom reports and immune-function measurements are not collected.',
    cannotEstablish: 'Symptoms and temperature are nonspecific; they cannot confirm infection or measure immune function.',
    refs: ['S9'],
  },
  {
    id: 'radiation',
    title: 'Radiation Exposure',
    explanation: 'NASA uses dedicated dosimetry to monitor space-radiation exposure.',
    whyItMatters: 'Radiation exposure is a distinct mission-monitoring concern and requires a dedicated measurement source.',
    monitors: 'Radiation records, dosimetry sources, and radiation trends are not supported.',
    cannotEstablish: 'Vital signs and consumer wearables do not provide personal radiation dose. The app does not estimate dose or convert between Gy and Sv.',
    refs: ['S10', 'S11'],
  },
]

export const NOT_CONNECTED = [
  'Wearable device feeds',
  'ECG traces and ultrasound reports',
  'DXA or QCT bone imaging',
  'Laboratory and pathogen results',
  'Live dosimetry and rate alarms',
  'Real emergency dispatch',
]

export const STATUS_MEANINGS: Array<{ status: string; text: string }> = [
  { status: 'normal', text: 'A future configured rule may assign this status when its conditions are met. It is not a statement of medical fitness or clearance, and never means healthy or safe for duty. No assessment is currently connected.' },
  { status: 'attention', text: 'A future configured rule may require review. The evidence, rule and next review step would need to be shown.' },
  { status: 'urgent', text: 'An urgent status would require an explicitly approved rule or request. This prototype has no emergency dispatch or connected responder.' },
  { status: 'insufficient_data', text: 'Available information is not enough to evaluate a rule. Missing data is not Normal. No assessment is currently connected.' },
]

// The reference says coverage is "complete, partial, missing" and is shown separately. It gives no longer definitions,
// so these three lines only restate that in plain words and are flagged for team confirmation (see docs/backend-contract-notes.md).
export const COVERAGE_MEANINGS: Array<{ coverage: string; text: string }> = [
  { coverage: 'complete', text: 'The inputs the rules need for this area are all present.' },
  { coverage: 'partial', text: 'Some of the inputs the rules need are present and some are not.' },
  { coverage: 'missing', text: 'None of the inputs the rules need are present.' },
]

export const GUIDANCE_CREDIT = 'Documentation prepared by Zoeya; research contributions by Zoeya and Yasha.'
