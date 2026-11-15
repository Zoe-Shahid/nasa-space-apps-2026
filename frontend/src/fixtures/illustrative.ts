// ILLUSTRATIVE LAYOUT FIXTURE. Not recorded data, not a mock of the API, never shown outside the dev-only design-system page.
export const ILLUSTRATIVE_NOTE = 'Illustrative layout fixture. Not recorded data and not from any API.'

export interface IllustrativeRow {
  id: string
  item: string
  note: string
}

export const ILLUSTRATIVE_ROWS: IllustrativeRow[] = [
  { id: 'row-a', item: 'Illustrative row A', note: 'Example text only' },
  { id: 'row-b', item: 'Illustrative row B', note: 'Example text only' },
]

export const FORMAT_DEMO_TIMESTAMP = '2000-01-01T09:05:00Z'
export const FORMAT_DEMO_DATE = '2000-01-01'
