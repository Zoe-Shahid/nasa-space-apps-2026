import { useSearchParams } from 'react-router-dom'

export function useAstronautId(): string | null {
  const [params] = useSearchParams()
  return params.get('astronaut')
}
