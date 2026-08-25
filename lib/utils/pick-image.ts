import * as ImagePicker from 'expo-image-picker'

// Elegir imagen desde la camara o desde la galeria. La camara necesita permiso
// propio (la galeria lo pide sola dentro del picker del sistema), y ese permiso
// se puede denegar para siempre: por eso 'denied' es un resultado mas y no una
// excepcion, para que cada pantalla avise a su manera.
export type PhotoSource = 'camera' | 'library'

export type PickImageResult =
  | { status: 'picked'; uri: string }
  | { status: 'canceled' }
  | { status: 'denied' }

export async function pickImage(
  source: PhotoSource,
  options?: { square?: boolean },
): Promise<PickImageResult> {
  const common = {
    mediaTypes: 'images' as const,
    quality: 1,
    ...(options?.square ? { allowsEditing: true, aspect: [1, 1] as [number, number] } : {}),
  }

  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) return { status: 'denied' }
    const result = await ImagePicker.launchCameraAsync(common)
    const uri = result.canceled ? null : (result.assets[0]?.uri ?? null)
    return uri ? { status: 'picked', uri } : { status: 'canceled' }
  }

  const result = await ImagePicker.launchImageLibraryAsync(common)
  const uri = result.canceled ? null : (result.assets[0]?.uri ?? null)
  return uri ? { status: 'picked', uri } : { status: 'canceled' }
}
