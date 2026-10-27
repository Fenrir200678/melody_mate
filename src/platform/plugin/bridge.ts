import { getNativeFunction } from '@juce-framework/webview'
import { z } from 'zod'

const NativeReplySchema = z.object({ ok: z.boolean(), error: z.string().optional(), payload: z.unknown().optional() })
export type NativeCommand = 'read' | 'commit' | 'panic' | 'space-capability' | 'forward-space'
const command = getNativeFunction('melodyMate')

export async function nativeCall(action: NativeCommand, payload?: unknown): Promise<unknown> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const pending = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error('Native bridge timed out. Reopen the editor to reload native state.')),
      5000
    )
  })
  let result: unknown
  try {
    result = await Promise.race([command(action, payload ?? null), pending])
  } finally {
    clearTimeout(timeout)
  }
  const reply = NativeReplySchema.parse(result)
  if (!reply.ok) throw new Error(reply.error ?? 'Native command failed.')
  return reply.payload
}

export function onNativeEvent(name: 'transport' | 'restore', listener: (payload: unknown) => void): () => void {
  const token = window.__JUCE__.backend.addEventListener(name, listener)
  return () => window.__JUCE__.backend.removeEventListener(token)
}
