// Research and guidance content for the Guidance page. EVERY sentence and reference here is taken from the team's
// approved reference screen (AstroOrbitX_Screens-2.pdf, page 8); reference URLs are the hyperlinks embedded in that
// PDF. Nothing was added, summarised from outside sources, or invented. Sentences are only sorted under four labels:
//   background  = established background research the team cited
//   recorded    = what this prototype records
//   limit       = what it cannot show
//   future      = future work the team named
// If a source is not in this file it is not supplied: see docs/backend-contract-notes.md for what is missing.

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

export interface AreaBlock {
  kind: 'background' | 'recorded' | 'limit' | 'future'
  text: string
  /** Reference IDs that support this block, as printed on the reference screen. */
  refs?: string[]
}

export interface ResearchArea {
  id: string
  title: string
  blocks: AreaBlock[]
}

export const AREA_BLOCK_LABEL: Record<AreaBlock['kind'], string> = {
  background: 'Background research',
  recorded: 'Recorded in this prototype',
  limit: 'Limit',
  future: 'Future work',
}

export const RESEARCH_AREAS: ResearchArea[] = [
  {
    id: 'cardiovascular',
    title: 'Cardiovascular health',
    blocks: [
      { kind: 'background', text: 'Microgravity shifts fluid toward the upper body, and blood-pressure regulation can be harder on return to gravity. ECG, blood-pressure monitoring and ultrasound give different information.', refs: ['S1'] },
      { kind: 'recorded', text: 'The prototype records context and trends only.' },
      { kind: 'limit', text: 'A pulse number cannot substitute for an ECG or ultrasound.', refs: ['S1'] },
    ],
  },
  {
    id: 'sleep',
    title: 'Sleep and fatigue',
    blocks: [
      { kind: 'background', text: 'Studies of shuttle and ISS crews link short sleep to circadian misalignment, slower responses and greater stress.', refs: ['S2', 'S3', 'S4'] },
      { kind: 'recorded', text: 'Duration, quality and fatigue are kept as separate inputs.' },
      { kind: 'limit', text: 'Observational findings support trend review, not a universal cutoff or a prediction for one person.', refs: ['S2', 'S3', 'S4'] },
    ],
  },
  {
    id: 'wellbeing',
    title: 'Psychological wellbeing',
    blocks: [
      { kind: 'background', text: 'Isolation, confinement and workload can affect wellbeing.', refs: ['S5', 'S6'] },
      { kind: 'recorded', text: 'Check-in ratings and notes are private, and a support request is optional.' },
      { kind: 'limit', text: 'Low mood or friction alone does not establish a disorder. No diagnosis or treatment is offered.', refs: ['S5', 'S6'] },
    ],
  },
  {
    id: 'bone-muscle',
    title: 'Bone and muscle',
    blocks: [
      { kind: 'background', text: 'Reduced mechanical loading can contribute to deconditioning.', refs: ['S7', 'S8'] },
      { kind: 'recorded', text: 'The prototype tracks a fictional exercise plan and reported completion.' },
      { kind: 'limit', text: 'An exercise log or smartwatch does not measure bone density.', refs: ['S7', 'S8'] },
      { kind: 'future', text: 'Imaging and strength tests are future imports.', refs: ['S7', 'S8'] },
    ],
  },
  {
    id: 'immune',
    title: 'Immune and infection concerns',
    blocks: [
      { kind: 'background', text: 'Altered immune responses and events such as rashes, cold sores and infections have been reported in some astronauts.', refs: ['S9'] },
      { kind: 'recorded', text: 'The app records reported symptoms with timing.' },
      { kind: 'limit', text: 'Symptoms and temperature are nonspecific and cannot confirm infection or immune competence.', refs: ['S9'] },
    ],
  },
  {
    id: 'radiation',
    title: 'Radiation exposure',
    blocks: [
      { kind: 'background', text: 'NASA uses dedicated dosimetry.', refs: ['S10', 'S11'] },
      { kind: 'recorded', text: 'Only synthetic interval records for one chosen stream are accepted, kept as Personal dose equivalent Hp(10) in mSv.' },
      { kind: 'limit', text: 'Vital signs and consumer wearables do not give personal dose. Gy and Sv are never mixed.', refs: ['S10', 'S11'] },
    ],
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
  { status: 'normal', text: 'No configured demonstration concern was triggered by the available required data. This is not a statement of medical fitness or clearance. It never means healthy or safe for duty.' },
  { status: 'attention', text: 'A configured demonstration rule requires review. Look at the reason, the records used and the next review step.' },
  { status: 'urgent', text: 'An explicit immediate-help request has been recorded in this prototype. It does not contact emergency services; no external responder has been contacted.' },
  { status: 'insufficient_data', text: 'The available required information is not enough to evaluate the rule. Add the missing data; do not read this as Normal.' },
]

// The reference says coverage is "complete, partial, missing" and is shown separately. It gives no longer definitions,
// so these three lines only restate that in plain words and are flagged for team confirmation (see docs/backend-contract-notes.md).
export const COVERAGE_MEANINGS: Array<{ coverage: string; text: string }> = [
  { coverage: 'complete', text: 'The inputs the rules need for this area are all present.' },
  { coverage: 'partial', text: 'Some of the inputs the rules need are present and some are not.' },
  { coverage: 'missing', text: 'None of the inputs the rules need are present.' },
]

export const GUIDANCE_CREDIT = 'Documentation prepared by Zoeya; research contributions by Zoeya and Yasha.'
