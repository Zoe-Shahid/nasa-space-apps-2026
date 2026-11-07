import { useState } from 'react'
import { Button, ButtonLink, Card, CoverageIndicator, DataTable, EmptyState, ErrorState, HelpText, InfoTip, LoadingState, PageHeading, Select, StatusBadge, SuccessMessage, Tabs, TextInput, UtcTime, type Column } from '../components/ui'
import { FORMAT_DEMO_DATE, FORMAT_DEMO_TIMESTAMP, ILLUSTRATIVE_NOTE, ILLUSTRATIVE_ROWS, type IllustrativeRow } from '../fixtures/illustrative'
import { COVERAGE_VALUES, STATUS_VALUES } from '../types/status'

const COLOURS = ['canvas', 'surface', 'ink', 'ink-muted', 'navy', 'border', 'border-strong', 'blue', 'purple', 'status-normal-bg', 'status-attention-bg', 'status-urgent-bg', 'status-insufficient-bg']

const columns: Column<IllustrativeRow>[] = [
  { key: 'item', header: 'Item', render: (r) => r.item },
  { key: 'note', header: 'Note', render: (r) => r.note },
]

/** Development-only reference page for the primitives. Not routed in production builds. */
export default function DesignSystemPage() {
  const [value, setValue] = useState('')
  return (
    <div className="ao-stack">
      <PageHeading title="Design system" description="Tokens and primitives used across AstroOrbitX. Development only." />
      <p className="ao-fixture-banner">{ILLUSTRATIVE_NOTE}</p>

      <Card heading="Colour tokens">
        <div className="ao-swatches">
          {COLOURS.map((c) => (
            <div className="ao-swatch" key={c}>
              <div className="ao-swatch__chip" style={{ background: `var(--ao-${c})` }} />
              <div className="ao-swatch__meta">
                <div>{c}</div>
                <code>--ao-{c}</code>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card heading="Typography">
        <div className="ao-stack">
          <h1>Heading 1: page title</h1>
          <h2>Heading 2: section</h2>
          <h3>Heading 3: panel</h3>
          <p>Body text at 16px with a readable line length for operational review screens.</p>
          <HelpText>Help text at 14px in the muted ink colour.</HelpText>
        </div>
      </Card>

      <Card heading="Buttons and links">
        <div className="ao-row">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Saving</Button>
          <ButtonLink to="/about" variant="secondary">
            Link styled as button
          </ButtonLink>
        </div>
      </Card>

      <Card heading="Form controls">
        <div className="ao-grid-2">
          <TextInput label="Example value" unit="unit" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} hint="Input check text goes here. It is not a healthy range." />
          <TextInput label="Fixed value" readOnly value="Fixed by the form" hint="Read-only values use a dashed border." />
          <TextInput label="With an error" defaultValue="abc" error="Use a number." />
          <TextInput label="Optional rating" optional placeholder="Not provided" />
          <Select label="Example select" options={[{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }]} />
        </div>
      </Card>

      <Card heading="Tabs">
        <div className="ao-stack">
          <Tabs variant="pill" label="Pill tabs example" tabs={[{ id: 'one', label: 'First', panel: <p>First panel</p> }, { id: 'two', label: 'Second', panel: <p>Second panel</p> }, { id: 'three', label: 'Third', panel: <p>Third panel</p> }]} />
          <Tabs variant="line" label="Line tabs example" tabs={[{ id: 'a', label: 'Summary', panel: <p>Summary panel</p> }, { id: 'b', label: 'Details', panel: <p>Details panel</p> }]} />
        </div>
      </Card>

      <Card heading="Status and coverage (separate concepts)">
        <div className="ao-stack">
          <div className="ao-row">
            {STATUS_VALUES.map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
            <StatusBadge status="unexpected_value" />
          </div>
          <div className="ao-row">
            {COVERAGE_VALUES.map((c) => (
              <CoverageIndicator key={c} coverage={c} />
            ))}
          </div>
          <div className="ao-row">
            <StatusBadge status="attention" />
            <CoverageIndicator coverage="partial" />
            <HelpText>Status and coverage shown together, as on a domain row.</HelpText>
          </div>
        </div>
      </Card>

      <Card heading="Table">
        <DataTable caption="Illustrative table" columns={columns} rows={ILLUSTRATIVE_ROWS} getRowKey={(r) => r.id} />
        <br />
        <DataTable caption="Empty table" columns={columns} rows={[]} getRowKey={(r) => r.id} />
      </Card>

      <Card heading="Help, tooltip and UTC time">
        <div className="ao-stack">
          <p>
            Tooltip example <InfoTip label="tooltip example">Short explanations open on hover, focus or press and close with Escape.</InfoTip>
          </p>
          <p>
            Timestamp format demo: <UtcTime value={FORMAT_DEMO_TIMESTAMP} />. Reporting date format demo: <UtcTime value={FORMAT_DEMO_DATE} dateOnly />.
          </p>
        </div>
      </Card>

      <Card heading="Loading, empty, error and success states">
        <div className="ao-grid-2">
          <LoadingState />
          <EmptyState title="No readings recorded for this selection" description="Add data when it is available to you." />
          <ErrorState message="The request did not complete." requestId="example-request-id" onRetry={() => undefined} />
          <SuccessMessage title="Synthetic record saved">Success messages are announced politely.</SuccessMessage>
        </div>
      </Card>
    </div>
  )
}
