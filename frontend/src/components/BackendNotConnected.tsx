import { EmptyState } from './ui'

/** Shown when the application has no connected endpoint for the requested resource. */
export function BackendNotConnected({ what }: { what: string }) {
  return (
    <EmptyState
      title="Unavailable in this MVP"
      description={`The ${what} view has no active data connection. No records are displayed or created here.`}
    />
  )
}
