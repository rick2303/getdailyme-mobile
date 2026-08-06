// La compresion real en nativo llega con la fase de fotos (expo-image-
// manipulator). El contrato espeja el de la web para que storage.ts no cambie.
export type CompressOptions = {
  maxEdgePx?: number
  quality?: number
  skipBelowBytes?: number
}

export const PHOTO_PRESET: CompressOptions = {
  maxEdgePx: 1600,
  quality: 0.82,
  skipBelowBytes: 300 * 1024,
}

export const AVATAR_PRESET: CompressOptions = {
  maxEdgePx: 512,
  quality: 0.85,
  skipBelowBytes: 80 * 1024,
}

export async function compressImage(file: File, _options?: CompressOptions): Promise<File> {
  return file
}
