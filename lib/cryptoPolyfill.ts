// Polyfills required by @supabase/auth-js on React Native so it can compute
// the PKCE S256 challenge instead of falling back to `plain`. Supabase's
// GoTrue checks for ALL of: `crypto`, `crypto.subtle`, AND `TextEncoder`
// before using S256 — if any is missing it silently sends
// `code_challenge_method=plain`, and the server then rejects the flow state
// with 404 "no valid flow state found" at exchangeCodeForSession.
//
// MUST be the first import in the app entry (index.ts) so it runs before
// `@supabase/supabase-js` is evaluated by any module.
import { Platform } from 'react-native'
import * as ExpoCrypto from 'expo-crypto'

if (Platform.OS !== 'web') {
  const g = globalThis as any

  // 1) crypto.getRandomValues + crypto.subtle.digest('SHA-256')
  if (typeof g.crypto !== 'object' || g.crypto === null) g.crypto = {}
  if (typeof g.crypto.getRandomValues !== 'function') {
    g.crypto.getRandomValues = (arr: any) => ExpoCrypto.getRandomValues(arr)
  }
  // Sin randomUUID los ids optimistas caen a un fallback que no es UUID y
  // Postgres rechaza el insert: el registro aparece y luego se esfuma.
  if (typeof g.crypto.randomUUID !== 'function') {
    g.crypto.randomUUID = () => ExpoCrypto.randomUUID()
  }
  // Force-replace `subtle` with our own object so any partial/broken Hermes
  // implementation can't shadow our digest. Hermes 0.13+ ships some web
  // primitives but `crypto.subtle.digest` is not reliably present on iOS.
  const subtle: any = {}
  const algoMap: Record<string, ExpoCrypto.CryptoDigestAlgorithm> = {
    'SHA-1': ExpoCrypto.CryptoDigestAlgorithm.SHA1,
    'SHA-256': ExpoCrypto.CryptoDigestAlgorithm.SHA256,
    'SHA-384': ExpoCrypto.CryptoDigestAlgorithm.SHA384,
    'SHA-512': ExpoCrypto.CryptoDigestAlgorithm.SHA512,
  }
  subtle.digest = async (
    algorithm: string | { name: string },
    data: ArrayBuffer | ArrayBufferView,
  ): Promise<ArrayBuffer> => {
    const name = (typeof algorithm === 'string' ? algorithm : algorithm?.name ?? '').toUpperCase()
    const algo = algoMap[name]
    if (!algo) throw new Error(`Unsupported digest algorithm: ${name}`)
    const bytes = data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    return ExpoCrypto.digest(algo, bytes as any)
  }
  g.crypto.subtle = subtle

  // 2) TextEncoder — required by Supabase's `hasCryptoSupport` check.
  // Hermes ≥ 0.13 ships it, but RN bridge / Expo Go / older runtimes may not.
  if (typeof g.TextEncoder !== 'function') {
    class TextEncoderPolyfill {
      readonly encoding = 'utf-8'
      encode(input: string = ''): Uint8Array {
        const utf8: number[] = []
        for (let i = 0; i < input.length; i++) {
          let codePoint = input.charCodeAt(i)
          if (codePoint >= 0xd800 && codePoint <= 0xdbff && i + 1 < input.length) {
            const next = input.charCodeAt(i + 1)
            if (next >= 0xdc00 && next <= 0xdfff) {
              codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (next - 0xdc00)
              i++
            }
          }
          if (codePoint < 0x80) {
            utf8.push(codePoint)
          } else if (codePoint < 0x800) {
            utf8.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f))
          } else if (codePoint < 0x10000) {
            utf8.push(
              0xe0 | (codePoint >> 12),
              0x80 | ((codePoint >> 6) & 0x3f),
              0x80 | (codePoint & 0x3f),
            )
          } else {
            utf8.push(
              0xf0 | (codePoint >> 18),
              0x80 | ((codePoint >> 12) & 0x3f),
              0x80 | ((codePoint >> 6) & 0x3f),
              0x80 | (codePoint & 0x3f),
            )
          }
        }
        return new Uint8Array(utf8)
      }
    }
    g.TextEncoder = TextEncoderPolyfill
  }
}
