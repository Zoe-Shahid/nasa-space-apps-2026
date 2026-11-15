import { describe, expect, it } from 'vitest'
import { liveAssessmentApi } from './assessmentApi'
import { liveHistoryApi } from './historyApi'
import { liveOverviewApi } from './overviewApi'
import { liveProfilesApi } from './profilesApi'
import { liveTrendsApi } from './trendsApi'

describe('live API availability', () => {
  it('connects profiles while leaving unsupported product APIs unavailable', () => {
    expect(liveProfilesApi).toBeDefined()
    expect({
      assessment: liveAssessmentApi,
      history: liveHistoryApi,
      overview: liveOverviewApi,
      trends: liveTrendsApi,
    }).toEqual({
      assessment: null,
      history: null,
      overview: null,
      trends: null,
    })
  })
})
