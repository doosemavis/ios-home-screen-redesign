import { useState } from 'react'

// 'none' until the shake key changes while this component is mounted and enabled,
// then alternates 'a'/'b' so the CSS animation restarts on every refusal.
export function useShakeOnChange(shakeKey, enabled = true) {
  const [base, setBase] = useState(shakeKey)
  if (!enabled && base !== shakeKey) setBase(shakeKey)
  if (!enabled || shakeKey === base) return 'none'
  return (shakeKey - base) % 2 === 1 ? 'a' : 'b'
}
